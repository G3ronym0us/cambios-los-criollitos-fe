'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { SidePanelBody, SidePanelFooter } from '@/components/shared/SidePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingState } from '@/components/shared/LoadingState';
import { paymentService } from '@/services/paymentService';
import { formatNumber } from '@/utils/functions';
import { getStatusMeta } from '@/utils/operationStatus';
import type { OperationData, OperationStatus } from '@/types/operation';
import type { OutgoingSettlementSummary, PaymentData } from '@/types/payment';
import { LinkOperationPanel } from './LinkOperationPanel';

interface OutgoingSettlementsPanelProps {
  payment: PaymentData;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Fila del reparto. `amount` va en la moneda del VALOR de su operación —80 ZELLE—, y `rate`
 * es lo que hace falta para saber cuánto del comprobante consume esa parte.
 */
interface Row {
  operation_uuid: string;
  amount: string;
  rate: number | null;
  pair_symbol: string | null;
  value_currency: string | null;
  status: string | null;
  /** Lo que le falta a la operación por cubrir, para proponer y para avisar si se pasa. */
  pending: number | null;
}

/**
 * Reparte un comprobante de SALIDA entre varias operaciones.
 *
 * El caso que lo motivó: un cliente manda dos Zelle —80 y 35— y se le paga todo en un solo
 * envío de bolívares. El comprobante tenía un vínculo único, así que había que elegir a cuál
 * de los dos tratos pertenecía y el otro se quedaba sin pago.
 *
 * Es el espejo de `PaymentAllocationsPanel`, con una diferencia que manda en toda la pantalla:
 * aquí cada parte va en la moneda de SU operación, no en la del comprobante. Por eso los
 * importes no se pueden sumar entre sí y lo que se compara contra el pago es cada parte
 * pasada por su tasa.
 */
export function OutgoingSettlementsPanel({
  payment,
  onSaved,
  onCancel,
}: OutgoingSettlementsPanelProps) {
  const [summary, setSummary] = useState<OutgoingSettlementSummary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await paymentService.getSettlements(payment.id);
    setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.error || 'No se pudo cargar el reparto');
      return;
    }
    setSummary(res.data);
    setRows(
      res.data.settlements.map((s) => ({
        operation_uuid: s.operation_uuid ?? '',
        amount: String(s.settled_amount),
        rate: s.settled_reference_rate,
        pair_symbol: s.pair_symbol,
        value_currency: s.operation_value_currency ?? null,
        status: s.operation_status,
        // Lo pendiente que devuelve el backend ya descuenta esta misma parte, así que el
        // techo de la fila es lo que falta MÁS lo que ella cubre.
        pending:
          s.operation_pending != null ? s.operation_pending + s.settled_amount : null,
      })),
    );
  }, [payment.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = summary?.amount ?? payment.amount ?? 0;
  const paymentCurrency = summary?.currency ?? payment.currency ?? '';

  const amountOf = (row: Row) => Number(row.amount.replace(',', '.')) || 0;
  /** Lo que esta parte consume del comprobante: su monto por la tasa a la que se pactó. */
  const consumedBy = (row: Row) => (row.rate ? amountOf(row) * row.rate : 0);

  const covered = Math.round(rows.reduce((acc, r) => acc + consumedBy(r), 0) * 100) / 100;
  const unassigned = Math.round((total - covered) * 100) / 100;
  const withoutRate = rows.some((r) => !r.rate);

  // Tramos de la barra, en la moneda del comprobante, que es la única en la que las partes
  // son comparables entre sí. Sin tasa una fila no se puede dibujar y por eso se avisa aparte.
  const segments = (() => {
    const base = total > 0 ? total : 1;
    const out: { key: string; label: string; amount: number; pct: number; fill: string }[] = [];
    rows.forEach((r, i) => {
      const amount = consumedBy(r);
      if (amount <= 0) return;
      out.push({
        key: r.operation_uuid,
        label: r.pair_symbol ?? 'Operación',
        amount,
        pct: (amount / base) * 100,
        fill: `var(--color-chart-${(i % 5) + 1})`,
      });
    });
    if (unassigned > 0.01) {
      out.push({
        key: 'sin-asignar',
        label: 'Sin asignar',
        amount: unassigned,
        pct: (unassigned / base) * 100,
        fill:
          'repeating-linear-gradient(45deg, var(--color-muted-foreground) 0 3px, transparent 3px 7px)',
      });
    }
    return out;
  })();

  const addOperation = async (op: OperationData) => {
    setPicking(false);
    if (rows.some((r) => r.operation_uuid === op.uuid)) {
      toast.error('Esa operación ya está en el reparto');
      return;
    }
    // La tasa y el pendiente los da el mismo cálculo que usa el diálogo de vincular, para
    // que proponer aquí y proponer allá no puedan dar números distintos.
    const res = await paymentService.outgoingCoverage(payment.id, op.uuid);
    const coverage = res.success ? res.data : null;
    const rate = coverage?.reference_rate ?? null;
    const pending = coverage?.pending ?? null;
    // Por defecto, lo que quede del comprobante sin pasarse de lo que la operación pide.
    const fromRest = rate ? Math.round((unassigned / rate) * 100) / 100 : 0;
    const proposed = pending != null ? Math.min(Math.max(fromRest, 0), pending) : fromRest;

    setRows((prev) => [
      ...prev,
      {
        operation_uuid: op.uuid,
        amount: proposed > 0 ? String(proposed) : '',
        rate,
        pair_symbol: op.pair_symbol,
        value_currency: coverage?.value_currency ?? op.from_currency ?? null,
        status: op.status,
        pending,
      },
    ]);
    if (!rate) {
      toast.error('No se pudo calcular la tasa de esa operación: escribe la parte a mano');
    }
  };

  const save = async () => {
    const parsed = rows.map((r) => ({
      operation_uuid: r.operation_uuid,
      settled_amount: amountOf(r),
    }));
    if (parsed.some((r) => !Number.isFinite(r.settled_amount) || r.settled_amount <= 0)) {
      toast.error('Cada parte del reparto debe ser mayor a 0');
      return;
    }
    setSubmitting(true);
    const res = await paymentService.setSettlements(payment.id, parsed);
    setSubmitting(false);
    if (res.success) {
      toast.success(
        rows.length > 1 ? 'Reparto guardado: el pago cubre varias operaciones' : 'Reparto guardado',
      );
      onSaved();
    } else {
      toast.error(res.error || 'No se pudo guardar el reparto');
    }
  };

  if (picking) {
    return (
      <LinkOperationPanel
        payment={payment}
        table="outgoing"
        onSuccess={() => setPicking(false)}
        onCancel={() => setPicking(false)}
        cancelLabel="Volver"
        onPick={addOperation}
        pickLabel="Añadir al reparto"
      />
    );
  }

  if (loading) {
    return (
      <SidePanelBody className="justify-center">
        <LoadingState label="Cargando reparto..." />
      </SidePanelBody>
    );
  }

  return (
    <>
      <SidePanelBody className="gap-3">
        <div>
          <div className="flex h-2.5 overflow-hidden rounded-full border border-border bg-muted">
            {segments.map((s) => (
              <span
                key={s.key}
                title={`${s.label} · ${formatNumber(s.amount)} ${paymentCurrency}`}
                style={{ width: `${s.pct}%`, background: s.fill }}
              />
            ))}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {segments.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: s.fill }}
                />
                {s.label} {formatNumber(s.amount)}
              </span>
            ))}
          </div>

          {unassigned < -0.01 ? (
            <p className="mt-2">
              <StatusBadge tone="destructive">
                El reparto se pasa {formatNumber(-unassigned)} {paymentCurrency} del comprobante
              </StatusBadge>
            </p>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Este comprobante todavía no cubre ninguna operación.
          </p>
        ) : (
          <>
            {/* El rótulo dice EN QUÉ está el importe de la derecha: es la moneda del valor
                de cada operación, no la del comprobante que se está repartiendo. */}
            <div className="flex items-center justify-between gap-2 pr-[3.25rem] text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Operaciones cubiertas</span>
              <span>Del valor de cada una</span>
            </div>
            <ul className="space-y-2">
              {rows.map((row, index) => {
                const amount = amountOf(row);
                const excess = row.pending != null && amount > row.pending + 0.01;
                return (
                  <li key={row.operation_uuid} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                          {row.pair_symbol ?? 'Operación'}
                          {row.status
                            ? (() => {
                                const meta = getStatusMeta(row.status as OperationStatus);
                                return (
                                  <StatusBadge tone={meta.tone} icon={meta.icon}>
                                    {meta.label}
                                  </StatusBadge>
                                );
                              })()
                            : null}
                        </p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground tabular-nums">
                          {row.rate ? (
                            <>
                              {formatNumber(amount)} {row.value_currency ?? ''}
                              <ArrowRight className="h-3.5 w-3.5" />
                              {formatNumber(consumedBy(row))} {paymentCurrency}
                              <span className="text-muted-foreground/70">· a {formatNumber(row.rate)}</span>
                            </>
                          ) : (
                            'Sin tasa de referencia: no se puede calcular cuánto consume del pago'
                          )}
                        </p>
                        {excess ? (
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Se pasa de lo que pide: le faltan {formatNumber(row.pending ?? 0)}{' '}
                            {row.value_currency ?? ''}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="relative">
                          <Input
                            inputMode="decimal"
                            value={row.amount}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r, i) => (i === index ? { ...r, amount: e.target.value } : r)),
                              )
                            }
                            aria-label={`Parte del valor de ${row.pair_symbol ?? 'la operación'} que cubre este pago`}
                            className="h-9 w-36 pr-16 text-right tabular-nums"
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1/2 max-w-14 -translate-y-1/2 truncate text-[10.5px] font-semibold text-muted-foreground">
                            {row.value_currency ?? ''}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 text-destructive hover:text-destructive"
                          onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                          aria-label="Quitar del reparto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-9 self-start border-dashed"
          onClick={() => setPicking(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir operación
        </Button>

        {unassigned > 0.01 && !withoutRate ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-700 tabular-nums dark:text-amber-400">
                  Quedan {formatNumber(unassigned)} {paymentCurrency} del pago sin operación
                </p>
                <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">
                  Si guardas así, esa parte de lo que se pagó no queda contra ningún trato.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </SidePanelBody>

      <SidePanelFooter>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex items-center gap-3">
          {unassigned > 0.01 && !withoutRate ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 tabular-nums dark:text-amber-400">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {formatNumber(unassigned)} sin asignar
            </span>
          ) : null}
          <Button onClick={save} disabled={submitting || rows.length === 0}>
            {submitting ? 'Guardando…' : 'Guardar reparto'}
          </Button>
        </div>
      </SidePanelFooter>
    </>
  );
}
