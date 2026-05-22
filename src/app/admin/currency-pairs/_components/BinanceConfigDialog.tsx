'use client';

import { Bitcoin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TradeMethodSelector from '@/components/TradeMethodSelector';
import type { CurrencyPairData } from '@/types/admin';
import type { BinanceConfigDraft } from '../_hooks/useCurrencyPairs';

interface BinanceConfigDialogProps {
  pair: CurrencyPairData | null;
  value: BinanceConfigDraft;
  error: string;
  onChange: (next: BinanceConfigDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function BinanceConfigDialog({
  pair,
  value,
  error,
  onChange,
  onSubmit,
  onCancel,
}: BinanceConfigDialogProps) {
  const open = !!pair;
  if (!pair) return null;

  const fiatSymbol =
    pair.from_currency.currency_type === 'FIAT'
      ? pair.from_currency.symbol
      : pair.to_currency.symbol;

  const cryptoSymbol =
    pair.from_currency.currency_type === 'CRYPTO'
      ? pair.from_currency.symbol
      : pair.to_currency.symbol;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Binance P2P</DialogTitle>
          <DialogDescription>
            {pair.display_name} — {pair.from_currency.name} ({pair.from_currency.currency_type}) →{' '}
            {pair.to_currency.name} ({pair.to_currency.currency_type})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Métodos de pago de Binance <span className="text-destructive">*</span>
            </Label>
            <TradeMethodSelector
              selectedMethods={value.banks_to_track}
              onChange={(methods) => onChange({ ...value, banks_to_track: methods })}
              fiatCurrency={fiatSymbol}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Seleccione los métodos de pago válidos desde Binance P2P
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="binance-amount">
              Monto a trackear <span className="text-destructive">*</span>
            </Label>
            <Input
              id="binance-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={value.amount_to_track ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  amount_to_track: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="100.00"
            />
            <p className="text-xs text-muted-foreground">
              Monto en {cryptoSymbol} para buscar órdenes
            </p>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onSubmit}>
            <Bitcoin className="h-4 w-4" />
            Activar Binance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
