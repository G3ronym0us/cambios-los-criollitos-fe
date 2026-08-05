'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LoanReferenceFields } from '@/components/loans/LoanReferenceFields';
import { clientService } from '@/services/clientService';
import type { LoanPreferredValue, ManualLoanCreate } from '@/types/client';

interface NewLoanDialogProps {
  clientUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (body: ManualLoanCreate) => Promise<boolean>;
}

const CURRENCIES = ['VES', 'COP', 'BRL', 'USD'];

const toNumber = (value: string): number | null => {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * «Ahora» como lo espera un `datetime-local`, que trabaja en hora local. Con el ISO en UTC
 * el campo arrancaba adelantado (cuatro horas en Caracas) y el backend rechazaba la fecha
 * por futura.
 */
const localNowForInput = (): string => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function NewLoanDialog({ clientUuid, open, onOpenChange, onCreate }: NewLoanDialogProps) {
  const [currency, setCurrency] = useState('VES');
  const [date, setDate] = useState(localNowForInput);
  const [fiatAmount, setFiatAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [bcvAmount, setBcvAmount] = useState('');
  const [preferredValue, setPreferredValue] = useState<LoanPreferredValue>('BCV');
  const [notes, setNotes] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Las equivalencias se piden al backend con la fecha del préstamo: valorar con la tasa
  // de hoy un préstamo de la semana pasada falsea la deuda.
  const loadValuation = useCallback(async () => {
    const amount = toNumber(fiatAmount);
    if (!amount) return;
    const at = new Date(date).toISOString();
    const result = await clientService.getManualLoanValuation(clientUuid, amount, currency, at);
    if (!result.success || !result.data) {
      setWarnings([result.error || 'No se pudieron calcular las equivalencias']);
      return;
    }
    setWarnings(result.data.warnings);
    setUsdtAmount(result.data.usdt_amount != null ? result.data.usdt_amount.toFixed(2) : '');
    setBcvAmount(result.data.bcv_amount != null ? result.data.bcv_amount.toFixed(2) : '');
  }, [clientUuid, currency, date, fiatAmount]);

  useEffect(() => {
    if (currency !== 'VES' && preferredValue === 'BCV') setPreferredValue('USDT');
  }, [currency, preferredValue]);

  const submit = async () => {
    const amount = toNumber(fiatAmount);
    if (!amount) return toast.error('Indica el monto del préstamo');
    setSubmitting(true);
    const ok = await onCreate({
      preferred_value: preferredValue,
      fiat_currency: currency,
      fiat_amount: amount,
      valuation_at: new Date(date).toISOString(),
      usdt_amount: toNumber(usdtAmount),
      bcv_amount: currency === 'VES' ? toNumber(bcvAmount) : null,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (ok) {
      setFiatAmount('');
      setUsdtAmount('');
      setBcvAmount('');
      setNotes('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar préstamo</DialogTitle>
          <DialogDescription>
            Para pagos que no pasaron por el bot. Las equivalencias se calculan con las
            tasas de la fecha que indiques.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="loan-currency">Moneda</Label>
              <Select value={currency} onValueChange={(value) => value && setCurrency(value)}>
                <SelectTrigger id="loan-currency" className="h-10 w-full">
                  <SelectValue>{currency}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loan-date">Fecha del préstamo</Label>
              <Input
                id="loan-date"
                type="datetime-local"
                value={date}
                // El backend rechaza fechas futuras; el selector no las ofrece.
                max={localNowForInput()}
                onChange={(event) => setDate(event.target.value)}
                onBlur={loadValuation}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loan-amount">Monto en {currency}</Label>
            <Input
              id="loan-amount"
              inputMode="decimal"
              value={fiatAmount}
              onChange={(event) => setFiatAmount(event.target.value)}
              onBlur={loadValuation}
              placeholder="0.00"
              className="tabular-nums"
            />
          </div>

          {warnings.map((warning) => (
            <p key={warning} className="text-xs text-amber-700 dark:text-amber-400">{warning}</p>
          ))}

          <LoanReferenceFields
            idPrefix="manual-loan"
            fiatCurrencyLabel={currency}
            bcvEnabled={currency === 'VES'}
            preferredValue={preferredValue}
            onPreferredValueChange={setPreferredValue}
            fiatAmount={fiatAmount}
            usdtAmount={usdtAmount}
            bcvAmount={bcvAmount}
            onFiatAmountChange={setFiatAmount}
            onUsdtAmountChange={setUsdtAmount}
            onBcvAmountChange={setBcvAmount}
          />

          <div className="space-y-1.5">
            <Label htmlFor="loan-notes">Nota (opcional)</Label>
            <Textarea
              id="loan-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Factura de luz de julio"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Registrando…' : 'Registrar préstamo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
