'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { SidePanelBody, SidePanelFooter } from '@/components/shared/SidePanel';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { operationService } from '@/services/operationService';
import { formatNumber } from '@/utils/functions';
import type { OperationCoverage, UncoveredReason } from '@/types/operation';

interface OperationCoveragePanelProps {
  operationUuid: string;
  onSaved: () => void;
  onCancel: () => void;
}

/** Los cuatro motivos por los que una parte del valor puede no tener comprobante. */
const MOTIVOS: { value: UncoveredReason; label: string }[] = [
  { value: 'CASH', label: 'efectivo en mano' },
  { value: 'OTHER_CHANNEL', label: 'otro canal' },
  { value: 'BALANCE', label: 'saldo a favor' },
  { value: 'ADJUSTMENT', label: 'ajuste' },
];

/**
 * Cuadra una operación pagada con VARIOS comprobantes.
 *
 * Es el espejo de `OutgoingSettlementsPanel`: la misma tabla de reparto, anclada en la
 * operación en vez de en el pago. El caso que lo pide es un trato de 350 pagado con tres pagos
 * móviles — buscándolos de a uno hay que llevar la suma de cabeza, y la operación ni siquiera
 * aparecía entre las sugeridas del segundo.
 *
 * La regla que manda toda la pantalla: **el monto en la moneda de salida no se teclea**. Es lo
 * que suman los comprobantes marcados, y de ahí sale la tasa. Por eso no hay ningún campo de
 * monto ni de tasa: cotizar 900 cuando eran 920 deja de ser posible.
 */
export function OperationCoveragePanel({
  operationUuid,
  onSaved,
  onCancel,
}: OperationCoveragePanelProps) {
  const [coverage, setCoverage] = useState<OperationCoverage | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [motivo, setMotivo] = useState<UncoveredReason | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await operationService.getCoverage(operationUuid);
    setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.error || 'No se pudo cargar la cobertura');
      return;
    }
    setCoverage(res.data);
    setMarcados(new Set(res.data.settlements.map((s) => s.payment_id)));
    setMotivo((res.data.uncovered_reason as UncoveredReason) ?? null);
  }, [operationUuid]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Todo lo que se puede marcar: lo que ya cubre la op más los candidatos libres. */
  const filas = useMemo(() => {
    if (!coverage) return [];
    const yaCubren = coverage.settlements.map((s) => ({
      payment_id: s.payment_id,
      amount: s.amount ?? 0,
      currency: s.currency,
      provider: null as string | null,
      reference: null as string | null,
      created_at: null as string | null,
      yaVinculado: true,
    }));
    const libres = coverage.candidates.map((c) => ({
      payment_id: c.payment_id,
      amount: c.free_amount,
      currency: c.currency,
      provider: c.provider,
      reference: c.reference,
      created_at: c.created_at,
      yaVinculado: false,
    }));
    return [...yaCubren, ...libres];
  }, [coverage]);

  const sumaMarcada = useMemo(
    () => filas.filter((f) => marcados.has(f.payment_id)).reduce((acc, f) => acc + (f.amount || 0), 0),
    [filas, marcados],
  );

  const valor = coverage?.value ?? 0;
  // Mientras no cuadre, lo que cubre lo marcado se estima a la tasa de referencia: la de la
  // operación sale de la suma y todavía no está cerrada.
  const tasaRef = coverage?.reference_rate ?? null;
  const cubreEstimado = tasaRef ? sumaMarcada / tasaRef : null;
  const tasaDerivada = valor > 0 && sumaMarcada > 0 ? sumaMarcada / valor : null;
  const faltaSinComprobante = Math.round((valor - (cubreEstimado ?? 0)) * 100) / 100;
  /** Cuadra cuando lo marcado, a la tasa que implicaría, cubre el valor entero. */
  const cuadra = marcados.size > 0 && Math.abs(faltaSinComprobante) <= 0.5;
  const hayHueco = marcados.size > 0 && faltaSinComprobante > 0.5;
  const puedeGuardar = marcados.size > 0 && (!hayHueco || motivo !== null);

  const alternar = (id: number) => {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const aplicarSugerencia = () => {
    if (!coverage?.suggestion?.length) {
      toast.info('Ningún conjunto de comprobantes cuadra con lo que falta');
      return;
    }
    setMarcados(new Set([...coverage.settlements.map((s) => s.payment_id), ...coverage.suggestion]));
  };

  const guardar = async () => {
    if (!coverage) return;
    setSubmitting(true);
    const res = await operationService.setCoverage(operationUuid, {
      payments: [...marcados].map((payment_id) => ({ payment_id })),
      partial: !cuadra && !hayHueco,
      ...(hayHueco && motivo
        ? { uncovered: { amount: faltaSinComprobante, reason: motivo } }
        : {}),
    });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error || 'No se pudo guardar la cobertura');
      return;
    }
    toast.success('Cobertura guardada');
    onSaved();
  };

  if (loading) return <LoadingState />;
  if (!coverage) return null;

  const monedaSalida = filas.find((f) => f.currency)?.currency ?? '';

  return (
    <>
      <SidePanelBody className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Valor del trato
              </span>
              <span className="text-xl font-bold tabular-nums text-foreground">
                {formatNumber(valor)}{' '}
                <span className="text-xs font-medium text-muted-foreground">
                  {coverage.value_currency}
                </span>
              </span>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              cubierto {formatNumber(coverage.delivered)} · falta {formatNumber(coverage.pending)}
            </span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="bg-primary"
              style={{ width: `${Math.min(100, valor > 0 ? ((cubreEstimado ?? 0) / valor) * 100 : 0)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            Comprobantes de este cliente
          </span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={aplicarSugerencia}>
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Sugerir combinación
          </Button>
        </div>

        {filas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Este cliente no tiene comprobantes de salida sin repartir.
          </p>
        ) : (
          <ul className="space-y-2">
            {filas.map((fila) => {
              const marcado = marcados.has(fila.payment_id);
              return (
                <li key={fila.payment_id}>
                  <button
                    type="button"
                    onClick={() => alternar(fila.payment_id)}
                    aria-pressed={marcado}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      marcado ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                        marcado
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {marcado ? '✓' : ''}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold tabular-nums text-foreground">
                        {formatNumber(fila.amount)}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          {fila.currency}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[
                          fila.created_at ? new Date(fila.created_at).toLocaleString('es-VE') : null,
                          fila.provider,
                          fila.reference ? `ref ${fila.reference}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {fila.yaVinculado ? (
                      <StatusBadge tone="neutral">ya vinculado</StatusBadge>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SidePanelBody>

      <SidePanelFooter className="flex-col items-stretch gap-2">
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Seleccionado</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatNumber(sumaMarcada)} {monedaSalida}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">cubre</span>
            <span className={`tabular-nums ${cuadra ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              {cuadra ? '' : '~'}
              {formatNumber(cubreEstimado ?? 0)} de {formatNumber(valor)} {coverage.value_currency}
            </span>
          </div>

          {cuadra && tasaDerivada ? (
            <div className="mt-1 rounded-md bg-primary/10 p-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold text-primary">Tasa de la operación</span>
                <span className="text-base font-bold tabular-nums text-primary">
                  {formatNumber(tasaDerivada)}
                </span>
              </div>
              <p className="text-[11px] text-primary/80">
                {formatNumber(sumaMarcada)} ÷ {formatNumber(valor)}
                {tasaRef ? ` · referencia del día ${formatNumber(tasaRef)}` : ''}
              </p>
            </div>
          ) : null}

          {hayHueco ? (
            <div className="mt-1 space-y-1.5 rounded-md bg-amber-500/10 p-2">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Faltan {formatNumber(faltaSinComprobante)} {coverage.value_currency} sin comprobante
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MOTIVOS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMotivo(m.value)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      motivo === m.value
                        ? 'bg-amber-600 text-white'
                        : 'border border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button size="sm" onClick={guardar} disabled={!puedeGuardar || submitting}>
            {submitting ? 'Guardando…' : 'Guardar cobertura'}
          </Button>
        </div>
      </SidePanelFooter>
    </>
  );
}
