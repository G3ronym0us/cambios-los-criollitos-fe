import React, { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import CurrencySelector from "./CurrencySelector";
import CurrencyInputFields from "./CurrencyInputFields";
import ShareableQuoteCard from "./ShareableQuoteCard";
import BCVService from "../services/bcvService";
import { adminService } from "../services/adminService";
import { getCurrencyName } from "../utils/currencyConfig";
import { Role } from "../utils/enums";
import { orientRateForDisplay } from "../utils/functions";

interface Rate {
  from_currency: string;
  to_currency: string;
  rate: number;
  base_rate?: number | null;
  percentage?: number | null;
  inverse_percentage: boolean;
  currency_pair_uuid?: string;
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

  // Último campo de monto editado por el usuario; define qué lado queda fijo al ajustar el porcentaje
  const [lastEdited, setLastEdited] = useState<'from' | 'to'>('from');
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
    // Limpiar estado si no hay montos proporcionados
    if (!fromAmount && !toAmount) {
      setCalculator((prev) => ({
        ...prev,
        fromCurrency,
        toCurrency,
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

    // Si no se encuentra tasa, reflejar igual el par elegido y limpiar resultado
    if (!directRate) {
      setCalculator((prev) => ({
        ...prev,
        fromCurrency,
        toCurrency,
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
      setLastEdited('to');
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
      setLastEdited('from');
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

  // Rellenar el equivalente BCV cuando ya hay conversión pero el campo quedó vacío
  // (en la primera carga, las tasas BCV y las del par llegan en orden no determinista)
  useEffect(() => {
    const activeRate = bcvMode === 'usd' ? bcvRate?.rate : euroRate?.rate;
    if (!activeRate) return;
    setCalculator((prev) => {
      if (prev.bcvAmount || prev.result == null || prev.amount === undefined) {
        return prev;
      }
      const bcv = getBCVAmount(
        prev.amount,
        prev.result,
        prev.fromCurrency,
        prev.toCurrency,
        activeRate
      );
      return bcv !== undefined ? { ...prev, bcvAmount: bcv.toString() } : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bcvRate, euroRate, bcvMode, calculator.result]);

  const firstCalculation = useCallback(() => {
    // Par por defecto ZELLE→VES; si no existe, cae a la primera tasa disponible.
    const directRate =
      rates.find(
        (rate) => rate.from_currency === "ZELLE" && rate.to_currency === "VES"
      ) ?? rates[0];

    if (directRate) {
      const result = directRate.inverse_percentage
        ? 1 / directRate.rate
        : 1 * directRate.rate;
      setCalculator((prev) => ({
        ...prev,
        fromCurrency: directRate.from_currency,
        toCurrency: directRate.to_currency,
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

  // Intercambiar monedas recalculando con la tasa del par invertido.
  const swapCurrencies = () => {
    calculateConversion(
      calculator.toCurrency,
      calculator.fromCurrency,
      calculator.amount
    );
  };

  const availableCurrencies = getAvailableCurrencies();

  const currentRate = rates.find(
    (r) => r.from_currency === calculator.fromCurrency && r.to_currency === calculator.toCurrency
  );

  const updatePercentage = (newPct: number) => {
    const clamped = Math.max(0, Math.min(20, isNaN(newPct) ? 0 : newPct));
    setSliderValue(clamped);

    if (currentRate?.base_rate == null) return;

    const previewRate = calcPreviewRate(
      currentRate.base_rate,
      clamped,
      currentRate.inverse_percentage
    );
    const activeRate = bcvMode === 'usd' ? bcvRate?.rate : euroRate?.rate;

    if (lastEdited === 'to' && calculator.result != null) {
      // El usuario escribió el monto TO: mantenerlo fijo y recalcular FROM
      const newAmount = roundToDecimals(
        applyRateConversion(
          calculator.result,
          previewRate,
          currentRate.inverse_percentage,
          true
        ),
        2
      );
      const newBcv = getBCVAmount(
        newAmount,
        calculator.result,
        calculator.fromCurrency,
        calculator.toCurrency,
        activeRate
      );

      setCalculator((prev) => ({
        ...prev,
        amount: newAmount,
        rate: previewRate,
        bcvAmount: newBcv !== undefined ? newBcv.toString() : prev.bcvAmount,
      }));
      return;
    }

    if (calculator.amount === undefined) return;

    const newResult = applyRateConversion(
      calculator.amount,
      previewRate,
      currentRate.inverse_percentage,
      false
    );

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
      const oriented = orientRateForDisplay(
        calculator.rate,
        currentRate?.inverse_percentage ?? false,
        calculator.fromCurrency,
        calculator.toCurrency
      );
      const v = oriented.value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
      lines.push(`Tasa: ${v} ${oriented.manyCurrency} = 1 ${oriented.unitCurrency}`);
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
        backgroundColor: '#FBFAF6',
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
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {shareMessage && (
              <p role="status" aria-live="polite" className="text-xs text-muted-foreground sm:mr-auto">
                {shareMessage}
              </p>
            )}
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              aria-busy={sharing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 touch-manipulation"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {sharing ? 'Generando…' : 'Compartir'}
            </button>
          </div>
        )}

        {/* Ajuste de porcentaje — solo MODERATOR/ROOT con par que tenga base_rate */}
        {isPrivileged && currentRate?.base_rate != null && (
          <div className="mt-4 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            {/* Header */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                <span>Tasa base (<span translate="no">Binance</span>)</span>
              </div>
              <span className="font-semibold tabular-nums text-foreground">
                {currentRate.base_rate.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </span>
            </div>

            {/* Percentage controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="pct-input" className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Porcentaje de ganancia
                </label>
                <span className="text-xs text-muted-foreground">Rango: 0% – 20%</span>
              </div>

              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => updatePercentage(parseFloat((sliderValue - 0.1).toFixed(1)))}
                  disabled={sliderValue <= 0}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-xl font-bold text-primary transition-colors hover:bg-accent active:bg-accent disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 touch-manipulation"
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
                    className="h-full min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 pr-8 text-center text-lg font-bold tabular-nums text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updatePercentage(parseFloat((sliderValue + 0.1).toFixed(1)))}
                  disabled={sliderValue >= 20}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-xl font-bold text-primary transition-colors hover:bg-accent active:bg-accent disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 touch-manipulation"
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
                className="w-full rounded accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation"
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
                      className={`rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'border border-border bg-card text-foreground hover:bg-accent'
                      }`}
                    >
                      {preset}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview + Save */}
            <div className="flex items-center justify-between gap-3 border-t border-primary/20 pt-3">
              <div className="min-w-0" aria-live="polite" aria-atomic="true">
                <p className="text-xs font-medium text-muted-foreground">Nueva tasa</p>
                <p className="truncate text-base font-bold tabular-nums text-foreground sm:text-lg">
                  {calcPreviewRate(currentRate.base_rate, sliderValue, currentRate.inverse_percentage).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}{' '}
                  <span className="text-sm font-medium text-primary">{calculator.toCurrency}</span>
                </p>
              </div>
              <Button
                onClick={handleSavePercentage}
                disabled={saving || Math.abs(sliderValue - (currentRate.percentage ?? 0)) < 0.05}
                aria-busy={saving}
                className="min-h-11 shrink-0 px-4"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>

            {saveError && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
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
            <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-amber-800 dark:text-amber-300">
                <strong>No se encontró tasa de conversión</strong> entre{" "}
                {getCurrencyName(calculator.fromCurrency)} y{" "}
                {getCurrencyName(calculator.toCurrency)}.
              </div>
              <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                Intenta convertir a través de USDT o selecciona otras monedas.
              </div>
            </div>
          )}

        {/* Conversiones rápidas sugeridas */}
        {availableCurrencies.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Conversiones rápidas:
            </p>
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
                .map((combo) => (
                  <Button
                    key={`${combo.from}-${combo.to}`}
                    variant="outline"
                    onClick={() =>
                      calculateConversion(
                        combo.from,
                        combo.to,
                        parseFloat(combo.amount)
                      )
                    }
                    className="min-h-11 px-4 text-sm"
                  >
                    {combo.amount} {combo.from} → {combo.to}
                  </Button>
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
            inversePercentage={currentRate?.inverse_percentage ?? false}
            bcvAmount={calculator.bcvAmount}
            bcvMode={bcvMode}
          />
        )}
      </div>
    </div>
  );
};

export default CurrencyCalculator;
