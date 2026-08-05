'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { LoanPreferredValue } from '@/types/client';

interface LoanReferenceFieldsProps {
  fiatCurrencyLabel: string;
  /** Solo el bolívar tiene tasa oficial: el backend rechaza BCV en cualquier otro par. */
  bcvEnabled: boolean;
  preferredValue: LoanPreferredValue;
  onPreferredValueChange: (value: LoanPreferredValue) => void;
  fiatAmount: string;
  usdtAmount: string;
  bcvAmount: string;
  onFiatAmountChange: (value: string) => void;
  onUsdtAmountChange: (value: string) => void;
  onBcvAmountChange: (value: string) => void;
  idPrefix: string;
}

/** Deja el importe con dos decimales como máximo, sin pelear con el cursor. */
const withTwoDecimals = (value: string) => {
  const clean = value.replace(',', '.').replace(/[^\d.]/g, '');
  const [whole, ...rest] = clean.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
};

/**
 * Elegir la referencia de la deuda y escribir los tres importes son lo mismo: cada unidad
 * es una tarjeta que se elige y donde se escribe. Compartido por el alta desde comprobante
 * y el alta manual para que las dos hablen igual.
 */
export function LoanReferenceFields({
  fiatCurrencyLabel,
  bcvEnabled,
  preferredValue,
  onPreferredValueChange,
  fiatAmount,
  usdtAmount,
  bcvAmount,
  onFiatAmountChange,
  onUsdtAmountChange,
  onBcvAmountChange,
  idPrefix,
}: LoanReferenceFieldsProps) {
  const references = [
    {
      value: 'FIAT' as const,
      label: fiatCurrencyLabel || 'Fiat',
      hint: 'valor fiat',
      id: `${idPrefix}-fiat-amount`,
      amount: fiatAmount,
      set: onFiatAmountChange,
      disabled: false,
    },
    {
      value: 'USDT' as const,
      label: 'USDT',
      hint: 'equivalente USDT',
      id: `${idPrefix}-usdt-amount`,
      amount: usdtAmount,
      set: onUsdtAmountChange,
      disabled: false,
    },
    {
      value: 'BCV' as const,
      label: 'USD BCV',
      hint: 'equivalente BCV',
      id: `${idPrefix}-bcv-amount`,
      amount: bcvAmount,
      set: onBcvAmountChange,
      disabled: !bcvEnabled,
    },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Label>Referencia para llevar la deuda</Label>
        <span className="text-xs text-muted-foreground">
          la deuda se conserva en la unidad que elijas
        </span>
      </div>
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Referencia para llevar la deuda"
      >
        {references.map((ref) => {
          const selected = preferredValue === ref.value;
          return (
            <div
              key={ref.value}
              className={cn(
                'rounded-lg border bg-card p-2.5 transition-colors',
                selected ? 'border-primary ring-3 ring-primary/10' : 'border-border',
                ref.disabled && 'opacity-60',
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={ref.disabled}
                onClick={() => onPreferredValueChange(ref.value)}
                className="flex min-h-10 w-full items-center justify-between gap-2 text-left"
              >
                <span
                  className={cn(
                    'truncate text-xs font-semibold',
                    selected ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {ref.label}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 rounded-full border-2',
                    selected ? 'border-[4px] border-primary' : 'border-border',
                  )}
                />
              </button>
              <Input
                id={ref.id}
                inputMode="decimal"
                min="0"
                step="0.01"
                value={ref.amount}
                onChange={(event) => ref.set(withTwoDecimals(event.target.value))}
                placeholder={ref.disabled ? 'No aplica' : '0.00'}
                disabled={ref.disabled}
                aria-label={`Valor en ${ref.label}`}
                className="h-9 tabular-nums"
              />
              <p
                className={cn(
                  'mt-1 truncate text-[10.5px]',
                  selected ? 'font-semibold text-primary' : 'text-muted-foreground',
                )}
              >
                {selected ? 'referencia de la deuda' : ref.hint}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
