import React, { useState } from "react";
import CurrencySelector from "./CurrencySelector";
import CurrencyInputFields from "./CurrencyInputFields";

// Iconos SVG
const CalculatorIcon = ({ className }: { className: string }) => (
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
      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

interface Rate {
  from_currency: string;
  to_currency: string;
  rate: number;
  inverse_percentage: boolean;
}

interface CurrencyConfig {
  [key: string]: {
    name: string;
    symbol: string;
    color: string;
  };
}

interface CurrencyCalculatorProps {
  rates: Rate[];
}

interface CalculatorState {
  amount?: number;
  fromCurrency: string;
  toCurrency: string;
  result: number | null;
  rate: number | null;
}

const CurrencyCalculator: React.FC<CurrencyCalculatorProps> = ({ rates }) => {
  const [calculator, setCalculator] = useState<CalculatorState>({
    amount: 1,
    fromCurrency: "ZELLE",
    toCurrency: "VES",
    result: null,
    rate: null,
  });

  // Configuración de monedas
  const currencyConfig: CurrencyConfig = {
    USDT: { name: "USDT", symbol: "$", color: "bg-green-500" },
    VES: { name: "Bolívares", symbol: "Bs", color: "bg-yellow-500" },
    COP: { name: "Pesos COP", symbol: "COL$", color: "bg-blue-500" },
    BRL: { name: "Reales", symbol: "R$", color: "bg-purple-500" },
    ZELLE: { name: "Zelle", symbol: "$", color: "bg-indigo-500" },
    PAYPAL: { name: "PayPal", symbol: "$", color: "bg-cyan-500" },
  };

  // Obtener monedas disponibles
  const getAvailableCurrencies = () => {
    const currencies = new Set<string>();
    rates.forEach((rate) => {
      currencies.add(rate.from_currency);
      currencies.add(rate.to_currency);
    });
    return Array.from(currencies).sort();
  };

  // Función para calcular conversión
  const calculateConversion = (
    fromCurrency: string,
    toCurrency: string,
    fromAmount?: number,
    toAmount?: number
  ) => {

    if (!fromAmount && !toAmount) {
      setCalculator((prev) => ({
        ...prev,
        result: null,
        rate: null,
        amount: undefined,
      }));
      return;
    }

    // Buscar tasa directa
    const directRate = rates.find(
      (rate) =>
        rate.from_currency === fromCurrency && rate.to_currency === toCurrency
    );

    if (directRate) {
      if (toAmount) {
        const amount = directRate.inverse_percentage
          ? toAmount * directRate.rate
          : toAmount / directRate.rate;
        setCalculator({
          fromCurrency,
          toCurrency,
          amount: amount,
          result: toAmount,
          rate: directRate.rate,
        });
        return;
      }

      if (fromAmount) {
        const result = directRate.inverse_percentage
          ? fromAmount / directRate.rate
          : fromAmount * directRate.rate;
        setCalculator({
          fromCurrency,
          toCurrency,
          amount: fromAmount,
          result: result,
          rate: directRate.rate,
        });
        return;
      }
    }

    // Si no encuentra conversión
    setCalculator((prev) => ({
      ...prev,
      result: null,
      rate: null,
    }));
  };

  React.useEffect(() => {
    const firstCalculation = () => {
      const directRate = rates.find(
        (rate) => rate.from_currency === "ZELLE" && rate.to_currency === "VES"
      );

      if (directRate) {
        if (1) {
          const result = directRate.inverse_percentage
            ? 1 / directRate.rate
            : 1 * directRate.rate;
          setCalculator({
            fromCurrency: "ZELLE",
            toCurrency: "VES",
            amount: 1,
            result: result,
            rate: directRate.rate,
          });
          return;
        }
      }
    };
    firstCalculation();
  }, []);

  // Función para intercambiar monedas
  const swapCurrencies = () => {
    setCalculator((prev) => ({
      ...prev,
      fromCurrency: prev.toCurrency,
      toCurrency: prev.fromCurrency,
    }));
  };

  // Función para obtener nombre de moneda
  const getCurrencyName = (code: string) => {
    return currencyConfig[code]?.name || code.toUpperCase();
  };

  const availableCurrencies = getAvailableCurrencies();

  const handleFromAmountChange = (amount: string) => {
    calculateConversion(
      calculator.fromCurrency,
      calculator.toCurrency,
      parseFloat(amount)
    );
  };

  const handleToAmountChange = (amount: string) => {
    calculateConversion(
      calculator.fromCurrency,
      calculator.toCurrency,
      undefined,
      parseFloat(amount)
    );
  };

  const handleFromCurrencyChange = (currency: string) => {
    calculateConversion(currency, calculator.toCurrency, calculator.amount);
  };

  const handleToCurrencyChange = (currency: string) => {
    calculateConversion(calculator.fromCurrency, currency, calculator.amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CalculatorIcon className="h-6 w-6" />
          Calculadora de Conversión
        </h2>
        <p className="text-blue-100 text-sm">
          Convierte entre diferentes monedas en tiempo real
        </p>
      </div>

      {/* Contenido */}
      <div className="p-4 sm:p-6">
        {/* Grid responsivo para los campos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Moneda origen */}
          <div className="lg:col-span-12">
            <CurrencySelector
              fromCurrency={calculator.fromCurrency}
              toCurrency={calculator.toCurrency}
              availableCurrencies={availableCurrencies}
              onFromCurrencyChange={handleFromCurrencyChange}
              onToCurrencyChange={handleToCurrencyChange}
              onSwap={swapCurrencies}
            />
          </div>

          <div className="lg:col-span-12">
            <CurrencyInputFields
              fromAmount={calculator.amount?.toString() || ""}
              toAmount={calculator.result?.toString() || ""}
              fromCurrency={calculator.fromCurrency}
              toCurrency={calculator.toCurrency}
              onFromAmountChange={handleFromAmountChange}
              onToAmountChange={handleToAmountChange}
            />
          </div>
        </div>

        {/* Mensaje si no hay conversión disponible */}
        {calculator.amount &&
          calculator.fromCurrency &&
          calculator.toCurrency &&
          !calculator.result && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-yellow-800">
                <strong>No se encontró tasa de conversión</strong> entre{" "}
                {getCurrencyName(calculator.fromCurrency)} y{" "}
                {getCurrencyName(calculator.toCurrency)}.
              </div>
              <div className="text-yellow-600 text-sm mt-1">
                Intenta convertir a través de USDT o selecciona otras monedas.
              </div>
            </div>
          )}

        {/* Conversiones rápidas sugeridas */}
        {availableCurrencies.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Conversiones rápidas:
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { from: "USDT", to: "VES", amount: "100" },
                { from: "USDT", to: "COP", amount: "100" },
                { from: "USDT", to: "BRL", amount: "100" },
                { from: "ZELLE", to: "VES", amount: "100" },
                { from: "PAYPAL", to: "VES", amount: "100" },
              ]
                .filter(
                  (combo) =>
                    availableCurrencies.includes(combo.from) &&
                    availableCurrencies.includes(combo.to)
                )
                .map((combo, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      calculateConversion(
                        combo.from,
                        combo.to,
                        parseFloat(combo.amount)
                      )
                    }
                    className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
                  >
                    {combo.amount} {combo.from} → {combo.to}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrencyCalculator;
