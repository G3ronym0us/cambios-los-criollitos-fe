import React from "react";

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

interface CurrencyConfig {
  [key: string]: {
    name: string;
    symbol: string;
    color: string;
  };
}

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
  const currencyConfig: CurrencyConfig = {
    USDT: { name: "USDT", symbol: "$", color: "bg-green-500" },
    VES: { name: "Bolívares", symbol: "Bs", color: "bg-yellow-500" },
    COP: { name: "Pesos COP", symbol: "COL$", color: "bg-blue-500" },
    BRL: { name: "Reales", symbol: "R$", color: "bg-purple-500" },
    ZELLE: { name: "Zelle", symbol: "$", color: "bg-indigo-500" },
    PAYPAL: { name: "PayPal", symbol: "$", color: "bg-cyan-500" },
  };

  const getCurrencyName = (code: string) => {
    return currencyConfig[code]?.name || code.toUpperCase();
  };

  const getCurrencySymbol = (code: string) => {
    return currencyConfig[code]?.symbol || "";
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Seleccionar Monedas
      </h3>
      <div className="grid grid-cols-[80%_20%]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Moneda origen */}
          <div className="lg:col-span-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              De
            </label>
            <select
              value={fromCurrency}
              onChange={(e) => onFromCurrencyChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            >
              <option value="">Seleccionar moneda origen</option>
              {availableCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {getCurrencySymbol(currency)} {getCurrencyName(currency)}
                </option>
              ))}
            </select>
          </div>

          {/* Botón intercambiar */}
          <div className="hidden lg:flex lg:col-span-2 justify-center">
            <button
              onClick={onSwap}
              disabled={!fromCurrency || !toCurrency}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 disabled:opacity-50 text-blue-700 disabled:text-gray-400 rounded-lg transition-colors"
              title="Intercambiar monedas"
            >
              <SwapIcon className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:block">
                Intercambiar
              </span>
            </button>
          </div>

          {/* Moneda destino */}
          <div className="lg:col-span-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              A
            </label>
            <select
              value={toCurrency}
              onChange={(e) => onToCurrencyChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            >
              <option value="">Seleccionar moneda destino</option>
              {availableCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {getCurrencySymbol(currency)} {getCurrencyName(currency)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-center lg:hidden">
          <button
            onClick={onSwap}
            disabled={!fromCurrency || !toCurrency}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 disabled:opacity-50 text-blue-700 disabled:text-gray-400 rounded-lg transition-colors"
            title="Intercambiar monedas"
          >
            <SwapIcon className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:block">
              Intercambiar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurrencySelector;
