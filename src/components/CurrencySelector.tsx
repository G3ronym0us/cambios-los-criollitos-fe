import React, { useState } from "react";
import CurrencyChip from "./currency/CurrencyChip";
import CurrencyDropdown from "./currency/CurrencyDropdown";

// Icono de intercambio
const SwapIcon = ({ className }: { className: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
    />
  </svg>
);

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
      {/* Contenedor principal con chips clickeables */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 sm:p-4 border-2 border-blue-200">
        <div className="flex items-center justify-center gap-2">
          {/* Chip moneda origen */}
          <CurrencyChip
            currency={fromCurrency}
            label="De"
            onClick={() => setShowFromDropdown(true)}
            isPlaceholder={!fromCurrency}
          />

          {/* Botón intercambiar - ENTRE las monedas */}
          <button
            onClick={onSwap}
            disabled={!fromCurrency || !toCurrency}
            className="p-1.5 sm:p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg transition-all shadow-sm border border-blue-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Intercambiar monedas"
          >
            <SwapIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Chip moneda destino */}
          <CurrencyChip
            currency={toCurrency}
            label="A"
            onClick={() => setShowToDropdown(true)}
            isPlaceholder={!toCurrency}
          />
        </div>
      </div>

      {/* Dropdown para moneda origen */}
      <CurrencyDropdown
        isOpen={showFromDropdown}
        currencies={availableCurrencies}
        selectedCurrency={fromCurrency}
        onSelect={onFromCurrencyChange}
        onClose={() => setShowFromDropdown(false)}
        title="Seleccionar moneda origen"
      />

      {/* Dropdown para moneda destino */}
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
