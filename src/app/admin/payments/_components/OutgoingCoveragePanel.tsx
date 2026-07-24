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
      setMode('RATE');
      setCustom('');
      onChange(null);
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

  // Tasa a la que quedaría el cambio con el monto elegido, para mostrarla al vuelo.
  const chosen =
    mode === 'RATE' ? suggested : mode === 'FULL' ? pending : Number.isFinite(customValue) ? customValue : null;
  const effectiveRate = chosen && chosen > 0 ? paid / chosen : null;
  const rateDiff =
    effectiveRate && coverage.reference_rate ? effectiveRate - coverage.reference_rate : null;

  const option = (active: boolean) =>
    `w-full rounded-lg border px-3 py-2 text-left transition-colors ${
      active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
    }`;

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
            {formatNumber(paid)} {payCur} ÷ {formatNumber(coverage.reference_rate ?? 0)}
          </span>
        </button>
      ) : null}

      {pending > 0 ? (
        <button type="button" className={option(mode === 'FULL')} onClick={() => pick('FULL', pending)}>
          <span className="block text-sm font-medium text-foreground">
            Cubre el pendiente · {formatNumber(pending)} {cur}
          </span>
          <span className="block text-xs text-muted-foreground">
            Tasa efectiva {formatNumber(coverage.full_effective_rate ?? 0)}
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
            Tasa efectiva {formatNumber(effectiveRate)}
            {rateDiff != null ? ` (${rateDiff > 0 ? '+' : ''}${formatNumber(rateDiff)})` : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
}
