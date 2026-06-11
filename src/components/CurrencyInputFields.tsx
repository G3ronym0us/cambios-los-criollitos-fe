'use client';

import { ArrowLeftRight } from 'lucide-react';
import {
  getCurrencyName,
  getCurrencySymbol,
  getCurrencyTint,
  getCurrencyText,
} from '@/utils/currencyConfig';
import { cn } from '@/lib/utils';

interface CurrencyInputFieldsProps {
  fromAmount?: string;
  toAmount?: string;
  fromCurrency: string;
  toCurrency: string;
  onFromAmountChange: (value: string) => void;
  onToAmountChange: (value: string) => void;
  bcvRate?: number;
  euroRate?: number;
  bcvMode?: 'usd' | 'eur';
  onBCVModeToggle?: () => void;
  bcvAmount?: string;
  onBCVAmountChange?: (value: string) => void;
}

interface AmountFieldProps {
  id: string;
  currency: string;
  value?: string;
  onChange: (value: string) => void;
}

// Campo de monto con el acento contextual de su moneda (legible en light y dark).
function AmountField({ id, currency, value, onChange }: AmountFieldProps) {
  return (
    <div className={cn('rounded-lg border-2 p-4 transition-shadow hover:shadow-md', getCurrencyTint(currency))}>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className={cn('text-sm font-medium', getCurrencyText(currency))}>
          {getCurrencyName(currency)}
        </label>
        <span
          className={cn(
            'rounded-full bg-background/60 px-2 py-1 text-xs font-medium',
            getCurrencyText(currency)
          )}
        >
          {getCurrencySymbol(currency)}
        </span>
      </div>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-0 bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
        placeholder="0.00"
        min="0"
        step="any"
      />
    </div>
  );
}

const CurrencyInputFields: React.FC<CurrencyInputFieldsProps> = ({
  fromAmount,
  toAmount,
  fromCurrency,
  toCurrency,
  onFromAmountChange,
  onToAmountChange,
  bcvRate,
  euroRate,
  bcvMode = 'usd',
  onBCVModeToggle,
  bcvAmount,
  onBCVAmountChange,
}) => {
  const activeRate = bcvMode === 'usd' ? bcvRate : euroRate;
  const shouldShowBCVField = activeRate && (fromCurrency === 'VES' || toCurrency === 'VES');
  const isEurMode = bcvMode === 'eur';
  const canToggleToEur = !!euroRate;
  const bcvLabel = isEurMode ? 'Equivalente en €BCV' : 'Equivalente en $BCV';
  const bcvSymbol = isEurMode ? '€BCV' : '$BCV';
  const bcvRateLabel = isEurMode
    ? `1 €BCV = ${euroRate?.toFixed(2)} VES`
    : `1 $BCV = ${bcvRate?.toFixed(2)} VES`;

  if (!fromCurrency || !toCurrency) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Selecciona las monedas para comenzar a calcular</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AmountField
          id="amount-from"
          currency={fromCurrency}
          value={fromAmount}
          onChange={onFromAmountChange}
        />
        <AmountField
          id="amount-to"
          currency={toCurrency}
          value={toAmount}
          onChange={onToAmountChange}
        />
      </div>

      {/* Campo BCV (solo cuando hay VES involucrado) */}
      {shouldShowBCVField && (
        <div className="rounded-lg border-2 border-sky-500/30 bg-sky-500/10 p-4 transition-shadow hover:shadow-md">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label
              htmlFor="amount-bcv"
              className="text-sm font-medium text-sky-700 dark:text-sky-400"
            >
              {bcvLabel}
            </label>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-sky-700/80 dark:text-sky-400/80 sm:inline">
                {bcvRateLabel}
              </span>
              {canToggleToEur && onBCVModeToggle && (
                <button
                  type="button"
                  onClick={onBCVModeToggle}
                  aria-label={isEurMode ? 'Cambiar a USD BCV' : 'Cambiar a EUR BCV'}
                  title={isEurMode ? 'Cambiar a USD BCV' : 'Cambiar a EUR BCV'}
                  className="flex min-h-9 items-center gap-1 rounded-full border border-sky-500/30 bg-background/70 px-2.5 py-1 text-xs font-medium text-sky-700 transition-colors hover:bg-background dark:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{isEurMode ? '$' : '€'}</span>
                  <ArrowLeftRight className="h-3 w-3" aria-hidden />
                </button>
              )}
              <span className="rounded-full bg-background/60 px-2 py-1 text-xs font-medium text-sky-700 dark:text-sky-400">
                {bcvSymbol}
              </span>
            </div>
          </div>
          <input
            id="amount-bcv"
            type="number"
            inputMode="decimal"
            value={bcvAmount || ''}
            onChange={(e) => onBCVAmountChange?.(e.target.value)}
            className="w-full border-0 bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            placeholder="0.00"
            min="0"
            step="any"
          />
          <p className="mt-1 text-xs text-sky-700/80 dark:text-sky-400/80 sm:hidden">
            {bcvRateLabel}
          </p>
        </div>
      )}
    </div>
  );
};

export default CurrencyInputFields;
