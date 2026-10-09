'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PairPicker, type PairRate, type PairUsage } from '@/components/shared/PairPicker';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { operationService, type RequoteChange } from '@/services/operationService';
import type { CurrencyPairData } from '@/types/admin';
import type { OperationData, RequotePreview } from '@/types/operation';
import { formatCaracasShortDateTime, formatNumber } from '@/utils/functions';

interface RequotePairControlProps {
  operation: OperationData;
  /** La operación ya recotizada, recién leída del backend. */
  onRequoted: (operation: OperationData) => void;
  disabled?: boolean;
}

type Side = 'SEND' | 'RECEIVE';

/** Unidades de `to` por 1 de `from`, que es como el operador lee una tasa. */
function effectiveRate(rate: number, inverse: boolean): number {
  return inverse && rate ? 1 / rate : rate;
}

/** El monto que fijó el cliente: lo que envía (SEND) o lo que recibe (RECEIVE). */
function fixedAmount(op: OperationData): number {
  return op.amount_side === 'RECEIVE' ? op.to_amount : op.from_amount;
}

function parseAmount(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Corregir la cotización de una operación al vincularla, antes de decir cuánto cubre el pago.
 *
 * Dos errores del bot que se arreglan aquí:
 * - El PAR: cotiza con el por defecto del cliente si el mensaje no dice la moneda. Con otro
 *   par se recotiza con la tasa que ese par tenía a la hora de la cotización.
 * - El MONTO o su LADO: tomó como COP enviados los 6000 Bs que había que entregar (op 5178).
 *   Sin cambiar el par se conserva la tasa con la que se cotizó.
 *
 * Cada cambio pide la vista previa al backend (el mismo cálculo que guardará) y sólo
 * «Recotizar» escribe.
 */
export function RequotePairControl({ operation, onRequoted, disabled }: RequotePairControlProps) {
  const [open, setOpen] = useState(false);
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [pairUuid, setPairUuid] = useState(operation.currency_pair_uuid ?? '');
  const [side, setSide] = useState<Side>(operation.amount_side);
  const [amountText, setAmountText] = useState(String(fixedAmount(operation)));
  const [preview, setPreview] = useState<RequotePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [rates, setRates] = useState<Map<string, PairRate>>(new Map());
  const [usage, setUsage] = useState<Map<string, PairUsage>>(new Map());
  const [clientOps, setClientOps] = useState(0);
  const [preferredUuid, setPreferredUuid] = useState<string | null>(null);
  const [ratesAt, setRatesAt] = useState<string | null>(null);

  // Como el selector de «Crear operación», pero con la tasa de cada par A LA HORA DE LA
  // COTIZACIÓN —la que aplica recotizar—, no la de hoy: si no, el selector decía 935 y la
  // vista previa 945. Y cuántas operaciones lleva el cliente en cada par, para que el bueno
  // salga arriba. Cada petición va por su lado: si alguna falla, se elige el par igual.
  useEffect(() => {
    if (!open || pairs.length) return;
    adminService.getCurrencyPairs(0, 200, true).then((res) => {
      if (res.success && res.data) setPairs(res.data.pairs);
    });
    operationService.requoteRates(operation.uuid).then((res) => {
      if (!res.success || !res.data) return;
      const at = res.data.rate_at;
      setRatesAt(at);
      setRates(new Map(res.data.rates.map((r) => [r.pair_uuid, { rate: r.rate, updatedAt: at }])));
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
  }, [open, pairs.length, operation.uuid, operation.client_phone, operation.client_uuid]);

  // Lo que cambió respecto a la operación; null si nada (o el monto no es válido).
  const amount = parseAmount(amountText);
  const change: RequoteChange | null = (() => {
    if (amount === null) return null;
    const next: RequoteChange = {};
    if (pairUuid && pairUuid !== operation.currency_pair_uuid) next.currency_pair_uuid = pairUuid;
    if (side !== operation.amount_side) next.amount_side = side;
    if (side !== operation.amount_side || Math.abs(amount - fixedAmount(operation)) > 0.005) {
      next.amount = amount;
    }
    return Object.keys(next).length ? next : null;
  })();
  const changeKey = change ? JSON.stringify(change) : '';

  // La vista previa sigue a lo que se va escribiendo, con un respiro para no pedir una por
  // tecla.
  useEffect(() => {
    if (!open) return;
    setPreview(null);
    if (!changeKey) return;
    const parsed = JSON.parse(changeKey) as RequoteChange;
    let active = true;
    const timer = setTimeout(async () => {
      const res = await operationService.requotePair(operation.uuid, parsed, true);
      if (!active) return;
      if (res.success && res.data) setPreview(res.data);
      else toast.error(res.error || 'No se pudo calcular la corrección');
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, changeKey, operation.uuid]);

  const close = () => {
    setOpen(false);
    setPreview(null);
    setPairUuid(operation.currency_pair_uuid ?? '');
    setSide(operation.amount_side);
    setAmountText(String(fixedAmount(operation)));
  };

  const confirm = async () => {
    if (!preview || !change) return;
    setBusy(true);
    const res = await operationService.requotePair(operation.uuid, change, false);
    if (!res.success) {
      setBusy(false);
      toast.error(res.error || 'No se pudo recotizar la operación');
      return;
    }
    const fresh = await operationService.getOperation(operation.uuid);
    setBusy(false);
    if (fresh.success && fresh.data) {
      toast.success('Cotización corregida');
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
        Corregir cotización
      </button>
    );
  }

  const pair = pairs.find((p) => p.uuid === pairUuid);
  const fromCur = pair?.from_currency?.symbol ?? operation.from_currency ?? '';
  const toCur = pair?.to_currency?.symbol ?? operation.to_currency ?? '';
  const sideButton = (value: Side, label: string) => (
    <button
      type="button"
      onClick={() => setSide(value)}
      disabled={busy}
      className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
        side === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-2 space-y-2 border-t border-dashed border-border pt-2">
      <PairPicker
        pairs={pairs}
        value={pairUuid}
        onChange={setPairUuid}
        usage={usage}
        rates={rates}
        totalOperations={clientOps}
        preferredUuid={preferredUuid}
        rateCaption={ratesAt ? `al ${formatCaracasShortDateTime(ratesAt)}` : undefined}
        clientName={operation.client_display_name}
        disabled={busy}
      />

      <div className="space-y-1">
        <div className="flex gap-1.5">
          {sideButton('SEND', `El cliente envía ${fromCur}`)}
          {sideButton('RECEIVE', `El cliente recibe ${toCur}`)}
        </div>
        <Input
          inputMode="decimal"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          disabled={busy}
          className="h-8"
          aria-label={`Monto en ${side === 'SEND' ? fromCur : toCur}`}
        />
      </div>

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
            tasa {formatNumber(effectiveRate(preview.rate, preview.inverse_percentage))}
            {preview.pair_uuid === operation.currency_pair_uuid
              ? ' · la misma con que se cotizó'
              : ` del ${formatCaracasShortDateTime(preview.rate_at)}`}
            {' · fija lo que '}
            {preview.amount_side === 'SEND' ? 'envía' : 'recibe'} el cliente
          </p>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={close} disabled={busy}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={() => void confirm()} disabled={busy || !preview}>
          {busy ? 'Guardando…' : 'Recotizar'}
        </Button>
      </div>
    </div>
  );
}
