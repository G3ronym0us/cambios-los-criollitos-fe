'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PairPicker } from '@/components/shared/PairPicker';
import { adminService } from '@/services/adminService';
import { operationService } from '@/services/operationService';
import type { CurrencyPairData } from '@/types/admin';
import type { OperationData, RequotePreview } from '@/types/operation';
import { formatCaracasShortDateTime, formatNumber } from '@/utils/functions';

interface RequotePairControlProps {
  operation: OperationData;
  /** La operación ya recotizada, recién leída del backend. */
  onRequoted: (operation: OperationData) => void;
  disabled?: boolean;
}

const NO_USAGE = new Map();
const NO_RATES = new Map();

/** Unidades de `to` por 1 de `from`, que es como el operador lee una tasa. */
function effectiveRate(rate: number, inverse: boolean): number {
  return inverse && rate ? 1 / rate : rate;
}

/**
 * Cambiar el par de una operación al vincularla. El bot cotiza con el par por defecto del
 * cliente cuando el mensaje no dice la moneda, y a veces era otro: aquí se elige el bueno,
 * se ve cómo quedaría (misma cantidad que fijó el cliente, tasa de ese par a la hora de la
 * cotización) y sólo entonces se guarda.
 */
export function RequotePairControl({ operation, onRequoted, disabled }: RequotePairControlProps) {
  const [open, setOpen] = useState(false);
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [pairUuid, setPairUuid] = useState(operation.currency_pair_uuid ?? '');
  const [preview, setPreview] = useState<RequotePreview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || pairs.length) return;
    adminService.getCurrencyPairs(0, 200, true).then((res) => {
      if (res.success && res.data) setPairs(res.data.pairs);
    });
  }, [open, pairs.length]);

  const close = () => {
    setOpen(false);
    setPreview(null);
    setPairUuid(operation.currency_pair_uuid ?? '');
  };

  const choose = async (uuid: string) => {
    setPairUuid(uuid);
    setPreview(null);
    if (!uuid || uuid === operation.currency_pair_uuid) return;
    setBusy(true);
    const res = await operationService.requotePair(operation.uuid, uuid, true);
    setBusy(false);
    if (res.success && res.data) setPreview(res.data);
    else toast.error(res.error || 'No se pudo recotizar con ese par');
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    const res = await operationService.requotePair(operation.uuid, preview.pair_uuid, false);
    if (!res.success) {
      setBusy(false);
      toast.error(res.error || 'No se pudo recotizar la operación');
      return;
    }
    const fresh = await operationService.getOperation(operation.uuid);
    setBusy(false);
    if (fresh.success && fresh.data) {
      toast.success(`Recotizada en ${preview.pair_symbol}`);
      onRequoted(fresh.data);
      setOpen(false);
      setPreview(null);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Cambiar par
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 border-t border-dashed border-border pt-2">
      <PairPicker
        pairs={pairs}
        value={pairUuid}
        onChange={(uuid) => void choose(uuid)}
        usage={NO_USAGE}
        rates={NO_RATES}
        totalOperations={0}
        clientName={operation.client_display_name}
        disabled={busy}
      />

      {preview ? (
        <div className="space-y-0.5 rounded-md bg-background px-2 py-1.5 text-xs tabular-nums">
          <p className="text-muted-foreground line-through">
            {preview.previous.pair_symbol} · {formatNumber(preview.previous.from_amount)} →{' '}
            {formatNumber(preview.previous.to_amount)}
          </p>
          <p className="font-medium text-foreground">
            {preview.pair_symbol} · {formatNumber(preview.from_amount)} {preview.from_currency} →{' '}
            {formatNumber(preview.to_amount)} {preview.to_currency}
          </p>
          <p className="text-muted-foreground">
            tasa {formatNumber(effectiveRate(preview.rate, preview.inverse_percentage))} del{' '}
            {formatCaracasShortDateTime(preview.rate_at)} · se mantiene lo que{' '}
            {preview.amount_side === 'SEND' ? 'envía' : 'recibe'} el cliente
          </p>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={close} disabled={busy}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={() => void confirm()} disabled={busy || !preview}>
          {busy ? 'Calculando…' : 'Recotizar'}
        </Button>
      </div>
    </div>
  );
}
