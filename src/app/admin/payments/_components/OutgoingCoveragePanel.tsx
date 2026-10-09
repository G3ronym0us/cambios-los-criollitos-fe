'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { paymentService } from '@/services/paymentService';
import { formatNumber } from '@/utils/functions';
import type { OutgoingCoverage } from '@/types/payment';

interface OutgoingCoveragePanelProps {
  paymentId: number;
  operationUuid: string;
  /** Monto elegido (en la moneda del valor de la operación); null = lo que da la tasa. */
  onChange: (settledAmount: number | null) => void;
}

type Mode = 'RATE' | 'FULL' | 'CUSTOM';

/**
 * ¿Lo que da la tasa es, en la práctica, el pendiente? Un céntimo o el 0,01 % del pendiente,
 * lo que sea mayor: 63.631,02 Bs × 3,6146 dan 229.999,99 de 230.000 COP, y esa diferencia es
 * redondeo, no un pago a medias.
 */
function coversExactly(suggested: number | null | undefined, pending: number): boolean {
  if (suggested == null || pending <= 0) return false;
  return Math.abs(suggested - pending) <= Math.max(0.01, pending * 0.0001) + 1e-9;
}

/**
 * Cuánto del valor de la operación cubre este comprobante de salida.
 *
 * Antes aquí se preguntaba el «monto realmente cambiado», que achicaba la operación. Lo que
 * hace falta es lo contrario: decir qué parte del trato paga este comprobante y dejar el
 * resto pendiente — o declarar que lo cubre entero, viendo a qué tasa quedó.
 */
export function OutgoingCoveragePanel({
  paymentId,
  operationUuid,
  onChange,
}: OutgoingCoveragePanelProps) {
  const [coverage, setCoverage] = useState<OutgoingCoverage | null>(null);
  const [mode, setMode] = useState<Mode>('RATE');
  const [custom, setCustom] = useState('');

  const load = useCallback(async () => {
    const res = await paymentService.outgoingCoverage(paymentId, operationUuid);
    if (res.success && res.data) {
      setCoverage(res.data);
      setCustom('');
      // Si cuadra, se registra el pendiente entero: con «lo que da la tasa» quedaba un
      // residuo de redondeo (0,01 COP) pendiente para siempre.
      if (coversExactly(res.data.suggested_settled_amount, res.data.pending)) {
        setMode('FULL');
        onChange(res.data.pending);
      } else {
        setMode('RATE');
        onChange(null);
      }
    } else if (res.error) {
      toast.error(res.error);
    }
    // onChange se omite a propósito: cambia en cada render del padre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, operationUuid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!coverage) return null;

  const cur = coverage.value_currency ?? '';
  const suggested = coverage.suggested_settled_amount;
  const pending = coverage.pending;
  const customValue = Number(custom.replace(',', '.'));
  const paid = coverage.payment.amount ?? 0;
  const payCur = coverage.payment.currency ?? '';

  const pick = (next: Mode, value: number | null) => {
    setMode(next);
    onChange(value);
  };

  // Las tasas vienen en "moneda del comprobante por unidad de valor", que en un COP-VES da
  // 0,2455 — ilegible redondeada a dos decimales. Si es < 1 se muestran todas dadas vuelta
  // (4,0738 pesos por bolívar), que es como el operador las piensa. Solo presentación.
  const flipped = (coverage.reference_rate ?? 1) < 1;
  const showRate = (rate: number) =>
    (flipped ? 1 / rate : rate).toLocaleString('es-ES', { maximumFractionDigits: 4 });

  // Tasa a la que quedaría el cambio con el monto elegido, para mostrarla al vuelo.
  const chosen =
    mode === 'RATE' ? suggested : mode === 'FULL' ? pending : Number.isFinite(customValue) ? customValue : null;
  const effectiveRate = chosen && chosen > 0 ? paid / chosen : null;

  const option = (active: boolean) =>
    `w-full rounded-lg border px-3 py-2 text-left transition-colors ${
      active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
    }`;

  // El pago da justo lo que falta: «lo que da la tasa» y «cubre el pendiente» son la misma
  // cifra a la misma tasa, y elegir entre ellas es ruido. Se confirma en una línea; el monto
  // a mano queda a un clic para el caso raro en que el pago cubra otra cosa.
  const exact = coversExactly(suggested, pending);
  if (exact && mode !== 'CUSTOM') {
    return (
      <div className="shrink-0 space-y-1 rounded-lg border border-primary bg-primary/5 p-3">
        <span className="block text-sm font-medium text-foreground">
          Cubre exacto el pendiente · {formatNumber(pending)} {cur}
        </span>
        <span className="block text-xs text-muted-foreground">
          {formatNumber(paid)} {payCur} {flipped ? '×' : '÷'} {showRate(coverage.reference_rate ?? 0)}
          {' · cuadra con la tasa de la cotización'}
        </span>
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setMode('CUSTOM')}
        >
          Otro monto
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 space-y-2 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">
          ¿Cuánto del valor cubre este pago?
        </span>
        <span className="text-xs text-muted-foreground">
          Valor {formatNumber(coverage.value)} {cur}
          {coverage.delivered > 0 ? ` · entregado ${formatNumber(coverage.delivered)}` : ''}
          {' · pendiente '}
          {formatNumber(pending)}
        </span>
      </div>

      {suggested != null ? (
        <button type="button" className={option(mode === 'RATE')} onClick={() => pick('RATE', null)}>
          <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
            Lo que da la tasa · {formatNumber(suggested)} {cur}
            {suggested < pending - 0.01 ? (
              <StatusBadge tone="warning">
                quedan {formatNumber(Math.round((pending - suggested) * 100) / 100)} pendientes
              </StatusBadge>
            ) : null}
          </span>
          <span className="block text-xs text-muted-foreground">
            {formatNumber(paid)} {payCur} {flipped ? '×' : '÷'}{' '}
            {showRate(coverage.reference_rate ?? 0)}
          </span>
        </button>
      ) : null}

      {pending > 0 ? (
        <button type="button" className={option(mode === 'FULL')} onClick={() => pick('FULL', pending)}>
          <span className="block text-sm font-medium text-foreground">
            Cubre el pendiente · {formatNumber(pending)} {cur}
          </span>
          <span className="block text-xs text-muted-foreground">
            Tasa efectiva {showRate(coverage.full_effective_rate ?? 0)}
            {coverage.full_rate_difference != null && coverage.full_amount_difference != null ? (
              <>
                {' · '}
                <span
                  className={
                    coverage.full_amount_difference < 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }
                >
                  {coverage.full_amount_difference < 0 ? '' : '+'}
                  {formatNumber(coverage.full_amount_difference)} {payCur} frente a la de referencia
                </span>
              </>
            ) : null}
          </span>
        </button>
      ) : null}

      <div className={option(mode === 'CUSTOM')}>
        <label htmlFor="coverage-custom" className="block text-sm font-medium text-foreground">
          Otro monto ({cur})
        </label>
        <Input
          id="coverage-custom"
          inputMode="decimal"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            const next = Number(e.target.value.replace(',', '.'));
            pick('CUSTOM', Number.isFinite(next) && next > 0 ? next : null);
          }}
          placeholder={suggested != null ? String(suggested) : ''}
          className="mt-1 h-9"
        />
        {mode === 'CUSTOM' && effectiveRate ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Tasa efectiva {showRate(effectiveRate)}
            {coverage.reference_rate
              ? ` (referencia ${showRate(coverage.reference_rate)})`
              : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
}
