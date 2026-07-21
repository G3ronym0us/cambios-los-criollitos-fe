'use client';

import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { ratesService } from '@/services/ratesService';
import { ExchangeRateResponse } from '@/types/currency';
import { ComparisonRow } from '@/components/shared/ComparisonRow';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  applyRounding,
  effectiveRate,
  formatAmount,
  niceAmount,
  rateDecimals,
  type RoundingDirection,
  type RoundingMode,
  type RoundingSide,
} from '@/utils/rounding';

interface RoundingPreviewProps {
  pairUuid: string;
  fromSymbol: string;
  toSymbol: string;
  mode: RoundingMode | null | undefined;
  step: number | null | undefined;
  direction: RoundingDirection | null | undefined;
  amountSide: RoundingSide | null | undefined;
}

/**
 * Muestra, con la tasa actual del par, cómo queda una cotización con y sin el
 * redondeo que se está configurando. Es solo previsualización: la cotización
 * real la calcula el backend (ver `src/utils/rounding.ts`).
 */
export function RoundingPreview({
  pairUuid,
  fromSymbol,
  toSymbol,
  mode,
  step,
  direction,
  amountSide,
}: RoundingPreviewProps) {
  const [rate, setRate] = useState<ExchangeRateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const result = await ratesService.getRateByPair(pairUuid);
      if (cancelled) return;
      setRate(result.success && result.data ? result.data : null);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [pairUuid]);

  if (!mode) return null;

  const shell = (children: React.ReactNode, badge?: React.ReactNode) => (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Calculator className="h-4 w-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Ejemplo con la tasa actual</p>
        {badge}
      </div>
      {children}
    </div>
  );

  if (loading) {
    return shell(<p className="text-xs text-muted-foreground">Cargando tasa actual...</p>);
  }

  const currentRate = rate?.is_manual ? rate.manual_rate ?? rate.rate : rate?.rate;
  if (!rate || !currentRate) {
    return shell(
      <p className="text-xs text-muted-foreground">
        Este par todavía no tiene una tasa registrada, así que no se puede mostrar el ejemplo. La
        configuración se guarda igual y aplicará en cuanto haya tasa.
      </p>
    );
  }

  if (!step || step <= 0) {
    return shell(
      <p className="text-xs text-muted-foreground">
        Ingresa un múltiplo mayor a 0 para ver cómo queda la cotización.
      </p>
    );
  }

  if (mode === 'AMOUNT' && !amountSide) {
    return shell(
      <p className="text-xs text-muted-foreground">
        Selecciona la moneda a redondear para ver el ejemplo.
      </p>
    );
  }

  const sourceBadge = (
    <StatusBadge tone={rate.is_manual ? 'warning' : 'neutral'}>
      {rate.is_manual ? 'Tasa manual' : 'Tasa automática'}
    </StatusBadge>
  );

  const eff = effectiveRate(currentRate, rate.inverse_percentage);
  const decimals = rateDecimals(eff);

  // Montos de ejemplo legibles según la magnitud de la tasa.
  const sendSample = eff >= 1 ? 100 : niceAmount(100 / eff);
  const receiveSample = niceAmount(sendSample * eff);

  if (mode === 'RATE') {
    const effRounded = applyRounding(eff, step, direction);
    // Si la tasa ya es múltiplo del paso, nada cambia: mostramos un solo valor
    // en vez de un "antes → después" idéntico, que se leería como un error.
    const rateChanged = Math.abs(effRounded - eff) > 1e-9;
    const sendBefore = sendSample * eff;
    const sendAfter = sendSample * effRounded;
    const receiveBefore = receiveSample / eff;
    const receiveAfter = effRounded > 0 ? receiveSample / effRounded : receiveBefore;

    return shell(
      <div>
        <ComparisonRow
          label={`Tasa por 1 ${fromSymbol}`}
          before={`${formatAmount(eff, decimals)} ${toSymbol}`}
          after={`${formatAmount(effRounded, decimals)} ${toSymbol}`}
          muted={!rateChanged}
          hint={
            rateChanged
              ? undefined
              : `La tasa actual ya es múltiplo de ${formatAmount(step, 6)}: con esta config no cambia nada.`
          }
        />
        <ComparisonRow
          label={`Cliente envía ${formatAmount(sendSample)} ${fromSymbol}`}
          before={`${formatAmount(sendBefore)} ${toSymbol}`}
          after={`${formatAmount(sendAfter)} ${toSymbol}`}
          muted={!rateChanged}
        />
        <ComparisonRow
          label={`Cliente quiere recibir ${formatAmount(receiveSample)} ${toSymbol}`}
          before={`${formatAmount(receiveBefore)} ${fromSymbol}`}
          after={`${formatAmount(receiveAfter)} ${fromSymbol}`}
          muted={!rateChanged}
          hint={rateChanged ? 'Se redondea la tasa y con ella se recalculan ambos montos.' : undefined}
        />
      </div>,
      sourceBadge
    );
  }

  // mode === 'AMOUNT': solo se redondea el lado que calcula el sistema.
  const targetSymbol = amountSide === 'FROM' ? fromSymbol : toSymbol;
  const roundsOnSend = amountSide === 'TO';

  const sendBefore = sendSample * eff;
  const receiveBefore = receiveSample / eff;
  const sendAfter = applyRounding(sendBefore, step, direction);
  const receiveAfter = applyRounding(receiveBefore, step, direction);

  // Una fila solo cambia si el redondeo aplica a ese lado Y el monto no era ya múltiplo.
  const sendChanged = roundsOnSend && Math.abs(sendAfter - sendBefore) > 1e-9;
  const receiveChanged = !roundsOnSend && Math.abs(receiveAfter - receiveBefore) > 1e-9;

  const notApplicable = (calculated: string) =>
    `Aquí el sistema calcula ${calculated}, y el redondeo está puesto en ${targetSymbol}: queda sin cambios.`;
  const alreadyMultiple = `Este monto ya es múltiplo de ${formatAmount(step, 6)}.`;

  return shell(
    <div>
      <ComparisonRow
        label={`Cliente envía ${formatAmount(sendSample)} ${fromSymbol}`}
        before={`${formatAmount(sendBefore)} ${toSymbol}`}
        after={`${formatAmount(sendAfter)} ${toSymbol}`}
        muted={!sendChanged}
        hint={
          sendChanged ? undefined : roundsOnSend ? alreadyMultiple : notApplicable(toSymbol)
        }
      />
      <ComparisonRow
        label={`Cliente quiere recibir ${formatAmount(receiveSample)} ${toSymbol}`}
        before={`${formatAmount(receiveBefore)} ${fromSymbol}`}
        after={`${formatAmount(receiveAfter)} ${fromSymbol}`}
        muted={!receiveChanged}
        hint={
          receiveChanged ? undefined : roundsOnSend ? notApplicable(fromSymbol) : alreadyMultiple
        }
      />
      <p className="pt-2 text-xs text-muted-foreground">
        El monto que el cliente fija nunca se toca; solo se redondea {targetSymbol} cuando es el
        lado que calcula el sistema.
      </p>
    </div>,
    sourceBadge
  );
}
