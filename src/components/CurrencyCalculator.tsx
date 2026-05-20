import React, { useState, useEffect, useCallback, useRef } from "react";
import CurrencySelector from "./CurrencySelector";
import CurrencyInputFields from "./CurrencyInputFields";
import ShareableQuoteCard from "./ShareableQuoteCard";
import BCVService from "../services/bcvService";
import { adminService } from "../services/adminService";
import { Role } from "../utils/enums";

interface Rate {
  from_currency: string;
  to_currency: string;
  rate: number;
  base_rate?: number | null;
  percentage?: number | null;
  inverse_percentage: boolean;
  currency_pair_uuid?: string;
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
  user?: { role: string } | null;
  onRateUpdated?: () => void;
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

const CurrencyCalculator: React.FC<CurrencyCalculatorProps> = ({ rates, user, onRateUpdated }) => {
  const [calculator, setCalculator] = useState<CalculatorState>({
    amount: 1,
    fromCurrency: "ZELLE",
    toCurrency: "VES",
    result: null,
    rate: null,
    bcvAmount: "",
  });

  const [bcvRate, setBcvRate] = useState<BCVRate | null>(null);
  const [euroRate, setEuroRate] = useState<BCVRate | null>(null);
  const [bcvMode, setBcvMode] = useState<'usd' | 'eur'>('usd');
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<string>('');
  const shareCardRef = useRef<HTMLDivElement>(null);
  const bcvService = BCVService.getInstance();

  const isPrivileged = user?.role === Role.MODERATOR || user?.role === Role.ROOT;

  const calcPreviewRate = (baseRate: number, pct: number, isInverse: boolean) => {
    const factor = 1 - pct / 100;
    return isInverse ? baseRate / factor : baseRate * factor;
  };

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

  // Helper: Calcular monto BCV equivalente usando la tasa activa (USD o EUR)
  const getBCVAmount = (
    fromAmount: number,
    toAmount: number,
    fromCurrency: string,
    toCurrency: string,
    activeRate: number | undefined,
    bcvValue?: number
  ): number | undefined => {
    if (bcvValue) return bcvValue;
    if (!activeRate) return undefined;

    let vesAmount: number;
    if (fromCurrency === "VES") {
      vesAmount = fromAmount;
    } else if (toCurrency === "VES") {
      vesAmount = toAmount;
    } else {
      return undefined;
    }

    return roundToDecimals(vesAmount / activeRate, 2);
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

    // Sync slider to the new pair's percentage
    setSliderValue(directRate.percentage ?? 0);

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

    // Calcular equivalente BCV usando la tasa activa (USD o EUR según bcvMode)
    const activeRate = bcvMode === 'usd' ? bcvRate?.rate : euroRate?.rate;
    const amountBCV = getBCVAmount(
      finalFromAmount,
      finalToAmount,
      fromCurrency,
      toCurrency,
      activeRate,
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

  // Efecto para cargar tasas BCV (USD y EUR)
  useEffect(() => {
    const loadRates = async () => {
      const [usdRate, eurRate] = await Promise.all([
        bcvService.getBCVRate(),
        bcvService.getEuroRate(),
      ]);
      setBcvRate(usdRate);
      setEuroRate(eurRate);
    };
    loadRates();
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
      setSliderValue(directRate.percentage ?? 0);
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

  const currentRate = rates.find(
    (r) => r.from_currency === calculator.fromCurrency && r.to_currency === calculator.toCurrency
  );

  const updatePercentage = (newPct: number) => {
    const clamped = Math.max(0, Math.min(20, isNaN(newPct) ? 0 : newPct));
    setSliderValue(clamped);

    if (currentRate?.base_rate == null || calculator.amount === undefined) return;

    const previewRate = calcPreviewRate(
      currentRate.base_rate,
      clamped,
      currentRate.inverse_percentage
    );
    const newResult = applyRateConversion(
      calculator.amount,
      previewRate,
      currentRate.inverse_percentage,
      false
    );

    const activeRate = bcvMode === 'usd' ? bcvRate?.rate : euroRate?.rate;
    const newBcv = getBCVAmount(
      calculator.amount,
      roundToDecimals(newResult, 2),
      calculator.fromCurrency,
      calculator.toCurrency,
      activeRate
    );

    setCalculator((prev) => ({
      ...prev,
      result: roundToDecimals(newResult, 2),
      rate: previewRate,
      bcvAmount: newBcv !== undefined ? newBcv.toString() : prev.bcvAmount,
    }));
  };

  const handleSavePercentage = async () => {
    if (!currentRate?.currency_pair_uuid) return;
    setSaving(true);
    setSaveError('');
    const result = await adminService.updatePairPercentage(
      currentRate.currency_pair_uuid,
      sliderValue,
      currentRate.inverse_percentage
    );
    setSaving(false);
    if (result.success) {
      onRateUpdated?.();
    } else {
      setSaveError(result.error || 'Error al guardar');
    }
  };

  const buildShareText = () => {
    const fmt = (n: number) =>
      n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const lines = [
      `*Cotización*`,
      `${fmt(calculator.amount ?? 0)} ${calculator.fromCurrency} → ${fmt(calculator.result ?? 0)} ${calculator.toCurrency}`,
    ];
    if (calculator.bcvAmount) {
      lines.push(`Equivalente BCV (${bcvMode.toUpperCase()}): ${fmt(parseFloat(calculator.bcvAmount))}`);
    }
    if (calculator.rate) {
      lines.push(`Tasa: 1 ${calculator.fromCurrency} = ${calculator.rate.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${calculator.toCurrency}`);
    }
    return lines.join('\n');
  };

  const handleShare = async () => {
    if (!shareCardRef.current || calculator.result == null) return;
    setSharing(true);
    setShareMessage('');
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(shareCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#1e1b4b',
      });
      if (!blob) throw new Error('No se pudo generar la imagen');

      const file = new File([blob], `cotizacion-${Date.now()}.png`, { type: 'image/png' });
      const text = buildShareText();

      // Mobile / supported: native share sheet (WhatsApp Business appears here)
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], text });
        setShareMessage('');
      } else {
        // Desktop fallback: download image + open WhatsApp with prefilled text
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        try {
          await navigator.clipboard?.writeText(text);
        } catch {
          /* ignore clipboard failure */
        }

        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        setShareMessage('Imagen descargada — adjúntala en WhatsApp Business');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al compartir';
      if (msg !== 'AbortError' && !msg.includes('aborted')) {
        setShareMessage(`No se pudo compartir: ${msg}`);
      }
    } finally {
      setSharing(false);
    }
  };

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

    const activeRate = bcvMode === 'usd' ? bcvRate?.rate : euroRate?.rate;
    if (!activeRate || !bcvAmount) return;

    const bcvValue = parseFloat(bcvAmount);
    if (isNaN(bcvValue)) return;

    const vesValue = bcvValue * activeRate;

    calculateConversion(
      calculator.fromCurrency,
      calculator.toCurrency,
      calculator.fromCurrency === "VES" ? vesValue : undefined,
      calculator.toCurrency === "VES" ? vesValue : undefined,
      bcvValue
    );
  };

  const handleBCVModeToggle = () => {
    const nextMode = bcvMode === 'usd' ? 'eur' : 'usd';
    setBcvMode(nextMode);
    // Recalcular el campo BCV con la nueva tasa
    const activeRate = nextMode === 'usd' ? bcvRate?.rate : euroRate?.rate;
    if (!activeRate || !calculator.amount) return;
    const { fromCurrency, toCurrency, amount, result } = calculator;
    let vesAmount: number | undefined;
    if (fromCurrency === 'VES') vesAmount = amount;
    else if (toCurrency === 'VES') vesAmount = result ?? undefined;
    if (vesAmount !== undefined) {
      setCalculator((prev) => ({
        ...prev,
        bcvAmount: (vesAmount! / activeRate).toFixed(2),
      }));
    }
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
          euroRate={euroRate?.rate}
          bcvMode={bcvMode}
          onBCVModeToggle={handleBCVModeToggle}
          bcvAmount={calculator.bcvAmount}
          onBCVAmountChange={handleBCVAmountChange}
        />

        {/* Botón compartir cotización */}
        {calculator.result != null && calculator.amount !== undefined && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
            {shareMessage && (
              <p role="status" aria-live="polite" className="text-xs text-gray-600 sm:mr-auto">
                {shareMessage}
              </p>
            )}
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              aria-busy={sharing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-green-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 touch-manipulation"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {sharing ? 'Generando…' : 'Compartir'}
            </button>
          </div>
        )}

        {/* Ajuste de porcentaje — solo MODERATOR/ROOT con par que tenga base_rate */}
        {isPrivileged && currentRate?.base_rate != null && (
          <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Tasa base (<span translate="no">Binance</span>)</span>
              </div>
              <span className="font-semibold text-gray-900 tabular-nums">
                {currentRate.base_rate.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </span>
            </div>

            {/* Percentage controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="pct-input" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Porcentaje de ganancia
                </label>
                <span className="text-xs text-gray-500">Rango: 0% – 20%</span>
              </div>

              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => updatePercentage(parseFloat((sliderValue - 0.1).toFixed(1)))}
                  disabled={sliderValue <= 0}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white border border-blue-300 rounded-lg text-blue-700 text-xl font-bold hover:bg-blue-100 active:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 touch-manipulation"
                  aria-label="Disminuir 0.1%"
                >
                  −
                </button>
                <div className="relative flex-1">
                  <input
                    id="pct-input"
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                    min={0}
                    max={20}
                    step={0.1}
                    value={Number(sliderValue.toFixed(1))}
                    onChange={(e) => updatePercentage(parseFloat(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full h-full min-h-[44px] px-3 py-2 pr-8 bg-white border border-blue-300 rounded-lg text-center text-lg font-bold text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold pointer-events-none">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updatePercentage(parseFloat((sliderValue + 0.1).toFixed(1)))}
                  disabled={sliderValue >= 20}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white border border-blue-300 rounded-lg text-blue-700 text-xl font-bold hover:bg-blue-100 active:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 touch-manipulation"
                  aria-label="Aumentar 0.1%"
                >
                  +
                </button>
              </div>

              <input
                type="range"
                min={0}
                max={20}
                step={0.1}
                value={sliderValue}
                onChange={(e) => updatePercentage(parseFloat(e.target.value))}
                className="w-full accent-blue-600 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 touch-manipulation"
                aria-label="Ajuste de porcentaje con slider"
              />

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5">
                {[0, 0.5, 1, 1.5, 2, 3, 5, 10].map((preset) => {
                  const isActive = Math.abs(sliderValue - preset) < 0.001;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updatePercentage(preset)}
                      aria-pressed={isActive}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors motion-reduce:transition-none tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {preset}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview + Save */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-blue-200">
              <div className="min-w-0" aria-live="polite" aria-atomic="true">
                <p className="text-xs text-gray-500 font-medium">Nueva tasa</p>
                <p className="text-base sm:text-lg font-bold text-blue-900 tabular-nums truncate">
                  {calcPreviewRate(currentRate.base_rate, sliderValue, currentRate.inverse_percentage).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}{' '}
                  <span className="text-sm font-medium text-blue-700">{calculator.toCurrency}</span>
                </p>
              </div>
              <button
                onClick={handleSavePercentage}
                disabled={saving || Math.abs(sliderValue - (currentRate.percentage ?? 0)) < 0.05}
                aria-busy={saving}
                className="shrink-0 px-4 py-2 min-h-[44px] bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 touch-manipulation"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>

            {saveError && (
              <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
                {saveError}
              </p>
            )}
          </div>
        )}

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

      {/* Card oculta solo para capturar a imagen al compartir */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', top: -99999, left: -99999, pointerEvents: 'none' }}
      >
        {calculator.result != null && calculator.amount !== undefined && calculator.rate != null && (
          <ShareableQuoteCard
            ref={shareCardRef}
            fromAmount={calculator.amount}
            toAmount={calculator.result}
            fromCurrency={calculator.fromCurrency}
            toCurrency={calculator.toCurrency}
            rate={calculator.rate}
            bcvAmount={calculator.bcvAmount}
            bcvMode={bcvMode}
          />
        )}
      </div>
    </div>
  );
};

export default CurrencyCalculator;
