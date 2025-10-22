import React, { useState, useEffect, useCallback } from "react";
import CurrencySelector from "./CurrencySelector";
import CurrencyInputFields from "./CurrencyInputFields";
import BCVService from "../services/bcvService";

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
  bcvAmount?: string;
}

interface BCVRate {
  rate: number;
  lastUpdated: string;
}

const CurrencyCalculator: React.FC<CurrencyCalculatorProps> = ({ rates }) => {
  const [calculator, setCalculator] = useState<CalculatorState>({
    amount: 1,
    fromCurrency: "ZELLE",
    toCurrency: "VES",
    result: null,
    rate: null,
    bcvAmount: "",
  });

  const [bcvRate, setBcvRate] = useState<BCVRate | null>(null);
  const bcvService = BCVService.getInstance();

  // Función para redondear valores calculados a 2 decimales
  const roundToDecimals = (value: number, decimals: number = 2): number => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  // Helper: Aplicar conversión de tasa
  const applyRateConversion = (
    amount: number,
    rate: number,
    inversePercentage: boolean,
    isReverseCalculation: boolean
  ): number => {
    if (isReverseCalculation) {
      // Calculando FROM desde TO (dirección inversa)
      return inversePercentage ? amount * rate : amount / rate;
    } else {
      // Calculando TO desde FROM (dirección normal)
      return inversePercentage ? amount / rate : amount * rate;
    }
  };

  // Helper: Calcular monto BCV equivalente
  const getBCVAmount = (
    fromAmount: number,
    toAmount: number,
    fromCurrency: string,
    toCurrency: string,
    bcvValue?: number
  ): number | undefined => {
    // Si bcvValue ya fue proporcionado, usarlo
    if (bcvValue) return bcvValue;

    // Si no hay tasa BCV disponible, retornar undefined
    if (!bcvRate?.rate) return undefined;

    // Determinar qué monto usar para el cálculo BCV
    let vesAmount: number;
    if (fromCurrency === "VES") {
      vesAmount = fromAmount;
    } else if (toCurrency === "VES") {
      vesAmount = toAmount;
    } else {
      return undefined; // No hay VES involucrado
    }

    return roundToDecimals(vesAmount / bcvRate.rate, 2);
  };

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
    toAmount?: number,
    bcvValue?: number
  ) => {
    console.log(fromCurrency, toCurrency, fromAmount, toAmount, bcvValue);

    // Limpiar estado si no hay montos proporcionados
    if (!fromAmount && !toAmount) {
      setCalculator((prev) => ({
        ...prev,
        result: null,
        rate: null,
        amount: undefined,
        bcvAmount: undefined,
      }));
      return;
    }

    // Buscar tasa directa
    const directRate = rates.find(
      (rate) =>
        rate.from_currency === fromCurrency && rate.to_currency === toCurrency
    );

    // Si no se encuentra tasa, limpiar resultado
    if (!directRate) {
      setCalculator((prev) => ({
        ...prev,
        result: null,
        rate: null,
      }));
      return;
    }

    // Calcular el monto faltante según la entrada
    let finalFromAmount: number;
    let finalToAmount: number;

    if (toAmount !== undefined) {
      // Usuario editó campo TO → calcular FROM
      const calculated = applyRateConversion(
        toAmount,
        directRate.rate,
        directRate.inverse_percentage,
        true // cálculo inverso
      );
      finalFromAmount = roundToDecimals(calculated, 2);
      finalToAmount = bcvValue ? roundToDecimals(toAmount, 2) : toAmount;
    } else {
      // Usuario editó campo FROM → calcular TO
      const calculated = applyRateConversion(
        fromAmount!,
        directRate.rate,
        directRate.inverse_percentage,
        false // cálculo normal
      );
      finalFromAmount = bcvValue ? roundToDecimals(fromAmount!, 2) : fromAmount!;
      finalToAmount = roundToDecimals(calculated, 2);
    }

    // Calcular equivalente BCV
    const amountBCV = getBCVAmount(
      finalFromAmount,
      finalToAmount,
      fromCurrency,
      toCurrency,
      bcvValue
    );

    // Actualizar estado
    setCalculator((prev) => ({
      ...prev,
      fromCurrency,
      toCurrency,
      amount: finalFromAmount,
      result: finalToAmount,
      rate: directRate.rate,
      bcvAmount: amountBCV ? amountBCV.toString() : "",
    }));
  };

  // Efecto para cargar tasa BCV
  useEffect(() => {
    const loadBCVRate = async () => {
      const rate = await bcvService.getBCVRate();
      setBcvRate(rate);
    };
    loadBCVRate();
  }, [bcvService]);

  const firstCalculation = useCallback(() => {
    const directRate = rates.find(
      (rate) => rate.from_currency === "ZELLE" && rate.to_currency === "VES"
    );

    if (directRate) {
      const result = directRate.inverse_percentage
        ? 1 / directRate.rate
        : 1 * directRate.rate;
      setCalculator((prev) => ({
        ...prev,
        fromCurrency: "ZELLE",
        toCurrency: "VES",
        amount: 1,
        result: result,
        rate: directRate.rate,
      }));
    }
  }, [rates]);

  React.useEffect(() => {
    if (rates.length > 0) {
      firstCalculation();
    }
  }, [firstCalculation, rates]);

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

  const handleBCVAmountChange = (bcvAmount: string) => {
    setCalculator((prev) => ({ ...prev, bcvAmount }));

    if (!bcvRate || !bcvAmount) return;

    const bcvValue = parseFloat(bcvAmount);
    if (isNaN(bcvValue)) return;

    const vesValue = bcvValue * bcvRate.rate;

    calculateConversion(
      calculator.fromCurrency,
      calculator.toCurrency,
      calculator.fromCurrency === "VES" ? vesValue : undefined,
      calculator.toCurrency === "VES" ? vesValue : undefined,
      bcvValue
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Contenido */}
      <div className="p-4 sm:p-6">
        {/* Selector de monedas */}
        <CurrencySelector
          fromCurrency={calculator.fromCurrency}
          toCurrency={calculator.toCurrency}
          availableCurrencies={availableCurrencies}
          onFromCurrencyChange={handleFromCurrencyChange}
          onToCurrencyChange={handleToCurrencyChange}
          onSwap={swapCurrencies}
        />

        {/* Visualización de la tasa actual - solo cuando hay tasa y monedas seleccionadas 
        {calculator.rate &&
          calculator.fromCurrency &&
          calculator.toCurrency && (
            <div className="mb-6 p-3 sm:p-4 bg-white rounded-lg border-2 border-blue-100 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-blue-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">
                      Tasa de Cambio
                    </p>
                    <p className="text-sm sm:text-base font-bold text-gray-900">
                      1 {calculator.fromCurrency} ={" "}
                      {calculator.rate.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}{" "}
                      {calculator.toCurrency}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium">Actualizado</span>
                </div>
              </div>
            </div>
          )}*/}

        {/* Campos de entrada */}
        <CurrencyInputFields
          fromAmount={calculator.amount?.toString() || ""}
          toAmount={calculator.result?.toString() || ""}
          fromCurrency={calculator.fromCurrency}
          toCurrency={calculator.toCurrency}
          onFromAmountChange={handleFromAmountChange}
          onToAmountChange={handleToAmountChange}
          bcvRate={bcvRate?.rate}
          bcvAmount={calculator.bcvAmount}
          onBCVAmountChange={handleBCVAmountChange}
        />

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
                    className="px-4 py-2 text-sm bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 font-medium rounded-lg transition-all hover:shadow-md border border-blue-200"
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
