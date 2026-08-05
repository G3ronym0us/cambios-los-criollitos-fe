'use client';

import { useEffect, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminService } from '@/services/adminService';
import { paymentService } from '@/services/paymentService';
import { formatAmountForInput, sanitizeAmountInput } from '@/utils/functions';
import type { CurrencyData } from '@/types/admin';
import type { PaymentData, PaymentTable } from '@/types/payment';

interface CorrectReceiptDialogProps {
  payment: PaymentData | null;
  table: PaymentTable;
  onCancel: () => void;
  onSaved: (payment: PaymentData) => void;
}

/**
 * Corregir a mano lo que el OCR leyó mal. Son los tres campos que cambian el destino del
 * comprobante: el monto (con qué operación cuadra), la moneda y la referencia (con qué
 * pago del banco cuadra). Los bancos y la identificación no se editan aquí — se leen del
 * texto crudo, que el cajón muestra al lado.
 *
 * El backend guarda el valor anterior, así que la corrección queda visible después.
 */
export function CorrectReceiptDialog({
  payment,
  table,
  onCancel,
  onSaved,
}: CorrectReceiptDialogProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);

  useEffect(() => {
    if (!payment) return;
    setAmount(formatAmountForInput(payment.amount));
    setCurrency((payment.currency ?? '').toUpperCase());
    setReference(payment.reference ?? '');
    setSubmitting(false);
  }, [payment]);

  useEffect(() => {
    adminService.getCurrencyPairs(0, 100, true).then((res) => {
      if (!res.success || !res.data) return;
      const map = new Map<string, CurrencyData>();
      for (const pair of res.data.pairs) {
        for (const item of [pair.from_currency, pair.to_currency]) map.set(item.symbol, item);
      }
      setCurrencies(Array.from(map.values()).sort((a, b) => a.symbol.localeCompare(b.symbol)));
    });
  }, []);

  if (!payment) return null;

  const parsedAmount = amount === '' ? null : Number(amount);
  const amountInvalid = parsedAmount != null && (!Number.isFinite(parsedAmount) || parsedAmount <= 0);
  // El símbolo actual del pago va en la lista aunque no venga de un par activo: si no, el
  // Select arrancaría vacío y "guardar" cambiaría la moneda sin que nadie lo pidiera.
  const symbols = Array.from(
    new Set([currency, 'VES', 'USDT', ...currencies.map((item) => item.symbol)]),
  ).filter(Boolean);

  const save = async () => {
    // Solo viaja lo que de verdad cambió: el backend marca `corrected_at` por cualquier
    // campo que reciba, y no queremos rotular como "corregido" un guardado sin cambios.
    const fields: { amount?: number; currency?: string; reference?: string } = {};
    if (parsedAmount != null && parsedAmount !== payment.amount) fields.amount = parsedAmount;
    if (currency && currency !== (payment.currency ?? '').toUpperCase()) fields.currency = currency;
    if (reference.trim() !== (payment.reference ?? '')) fields.reference = reference.trim();

    if (Object.keys(fields).length === 0) {
      onCancel();
      return;
    }

    setSubmitting(true);
    const res = await paymentService.updateFields(table, payment.id, fields);
    setSubmitting(false);
    if (res.success && res.data) {
      toast.success('Comprobante corregido');
      onSaved(res.data);
    } else {
      toast.error(res.error || 'No se pudo corregir el comprobante');
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <ScanLine className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Corregir lo que leyó el bot</DialogTitle>
              <DialogDescription className="text-pretty">
                Comprobante #{payment.id}. Queda registrado qué había leído la máquina.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="correct-amount">Monto</Label>
              <Input
                id="correct-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const next = sanitizeAmountInput(e.target.value);
                  if (next !== null) setAmount(next);
                }}
                className="tabular-nums"
              />
            </div>
            <div className="w-32 space-y-1.5">
              <Label htmlFor="correct-currency">Moneda</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value ?? '')}>
                <SelectTrigger id="correct-currency" className="h-10 w-full">
                  <SelectValue placeholder="Moneda" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="correct-reference">Referencia</Label>
            <Input
              id="correct-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Sin referencia"
              className="font-mono"
            />
          </div>

          {amountInvalid ? (
            <p className="text-xs font-medium text-destructive">El monto debe ser mayor que cero.</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={submitting || amountInvalid}>
            {submitting ? 'Guardando…' : 'Guardar corrección'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
