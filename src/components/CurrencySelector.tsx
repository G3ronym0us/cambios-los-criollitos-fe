import React, { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import CurrencyChip from "./currency/CurrencyChip";
import CurrencyDropdown from "./currency/CurrencyDropdown";

interface CurrencySelectorProps {
  fromCurrency: string;
  toCurrency: string;
  availableCurrencies: string[];
  onFromCurrencyChange: (currency: string) => void;
  onToCurrencyChange: (currency: string) => void;
  onSwap: () => void;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  fromCurrency,
  toCurrency,
  availableCurrencies,
  onFromCurrencyChange,
  onToCurrencyChange,
  onSwap,
}) => {
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  return (
    <div className="mb-4">
      <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
        <div className="flex items-center justify-center gap-2">
          <CurrencyChip
            currency={fromCurrency}
            label="De"
            onClick={() => setShowFromDropdown(true)}
            isPlaceholder={!fromCurrency}
          />

          <button
            type="button"
            onClick={onSwap}
            disabled={!fromCurrency || !toCurrency}
            aria-label="Intercambiar monedas"
            title="Intercambiar monedas"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
          </button>

          <CurrencyChip
            currency={toCurrency}
            label="A"
            onClick={() => setShowToDropdown(true)}
            isPlaceholder={!toCurrency}
          />
        </div>
      </div>

      <CurrencyDropdown
        isOpen={showFromDropdown}
        currencies={availableCurrencies}
        selectedCurrency={fromCurrency}
        onSelect={onFromCurrencyChange}
        onClose={() => setShowFromDropdown(false)}
        title="Seleccionar moneda origen"
      />

      <CurrencyDropdown
        isOpen={showToDropdown}
        currencies={availableCurrencies}
        selectedCurrency={toCurrency}
        onSelect={onToCurrencyChange}
        onClose={() => setShowToDropdown(false)}
        title="Seleccionar moneda destino"
      />
    </div>
  );
};

export default CurrencySelector;
