'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PairPicker, type PairRate, type PairUsage } from '@/components/shared/PairPicker';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { operationService } from '@/services/operationService';
import { ratesService } from '@/services/ratesService';
import type { CurrencyPairData } from '@/types/admin';
import type { OperationData, RequotePreview } from '@/types/operation';
import { formatCaracasShortDateTime, formatNumber } from '@/utils/functions';
import { quotedRateOf } from '@/utils/rounding';

interface RequotePairControlProps {
  operation: OperationData;
  /** La operación ya recotizada, recién leída del backend. */
  onRequoted: (operation: OperationData) => void;
  disabled?: boolean;
}

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
  const [rates, setRates] = useState<Map<string, PairRate>>(new Map());
  const [usage, setUsage] = useState<Map<string, PairUsage>>(new Map());
  const [clientOps, setClientOps] = useState(0);
  const [preferredUuid, setPreferredUuid] = useState<string | null>(null);

  // Lo mismo que el selector de «Crear operación»: la tasa vigente de cada par y cuántas
  // operaciones lleva el cliente en cada uno, para que el par bueno salga arriba. Cada
  // petición va por su lado: si alguna falla, se elige el par igual, sin ese dato. La tasa
  // que se aplica al recotizar es la de la hora de la cotización: la muestra la vista previa.
  useEffect(() => {
    if (!open || pairs.length) return;
    adminService.getCurrencyPairs(0, 200, true).then((res) => {
      if (res.success && res.data) setPairs(res.data.pairs);
    });
    ratesService.getAllActiveRates().then((res) => {
      if (!res.success || !res.data) return;
      setRates(
        new Map(
          res.data.map((r) => [
            r.currency_pair_uuid,
            { rate: quotedRateOf(r), updatedAt: r.updated_at ?? r.created_at ?? null },
          ]),
        ),
      );
    });
    if (operation.client_phone) {
      operationService
        .getOperations({ phone: operation.client_phone, limit: 100 })
        .then((res) => {
          if (!res.success || !res.data) return;
          const counts = new Map<string, PairUsage>();
          for (const op of res.data.operations) {
            if (!op.currency_pair_uuid) continue;
            counts.set(op.currency_pair_uuid, {
              count: (counts.get(op.currency_pair_uuid)?.count ?? 0) + 1,
            });
          }
          setUsage(counts);
          setClientOps(res.data.operations.length);
        });
    }
    if (operation.client_uuid) {
      clientService.getClient(operation.client_uuid).then((res) => {
        if (res.success && res.data) setPreferredUuid(res.data.preferred_pair_uuid);
      });
    }
  }, [open, pairs.length, operation.client_phone, operation.client_uuid]);

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
        usage={usage}
        rates={rates}
        totalOperations={clientOps}
        preferredUuid={preferredUuid}
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
