'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { CurrencyData, CurrencyPairData } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DialogFooter } from '@/components/ui/dialog';
import { defaultValues, type CurrencyPairFormData } from './sections/formShared';
import { GeneralSection } from './sections/GeneralSection';
import { RateSourceSection } from './sections/RateSourceSection';

export type { CurrencyPairFormData };

interface CurrencyPairFormProps {
  currencies: CurrencyData[];
  basePairs: CurrencyPairData[];
  error: string;
  setError: (error: string) => void;
  validateBinanceForm: (data: CurrencyPairFormData) => Promise<boolean>;
  getFiatCurrencyFromPair: (from: string, to: string) => string | null;
  onSubmit: (data: CurrencyPairFormData) => Promise<void>;
  onCancel: () => void;
}

/**
 * Formulario de CREACIÓN de un par. Deliberadamente corto: monedas, tipo,
 * estados y Binance. La configuración fina (USDT, redondeo) se hace después en
 * `/admin/currency-pairs/[uuid]`, adonde se navega al crear.
 */
export function CurrencyPairForm({
  currencies,
  basePairs,
  error,
  setError,
  validateBinanceForm,
  getFiatCurrencyFromPair,
  onSubmit,
  onCancel,
}: CurrencyPairFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CurrencyPairFormData>({ defaultValues });

  const watchBinanceTracked = watch('binance_tracked');
  const watchFromCurrency = watch('from_currency_uuid');
  const watchToCurrency = watch('to_currency_uuid');

  useEffect(() => {
    setError('');
  }, [setError]);

  const fiatForBinance = getFiatCurrencyFromPair(watchFromCurrency, watchToCurrency);

  const submit = async (data: CurrencyPairFormData) => {
    if (data.from_currency_uuid === data.to_currency_uuid) {
      setError('Las monedas de origen y destino deben ser diferentes');
      return;
    }
    const valid = await validateBinanceForm(data);
    if (!valid) return;
    await onSubmit(data);
  };

  const sectionProps = { control, watch, setValue, errors };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <GeneralSection {...sectionProps} currencies={currencies} basePairs={basePairs} />

      <div className="space-y-2">
        <label className="flex min-h-11 items-center gap-3">
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
            )}
          />
          <span className="text-sm font-medium">Par activo</span>
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <Controller
            name="is_monitored"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
            )}
          />
          <span className="text-sm font-medium">Monitorear para scraping</span>
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <Controller
            name="binance_tracked"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
            )}
          />
          <span className="text-sm font-medium">Rastreado en Binance P2P</span>
        </label>
      </div>

      <RateSourceSection
        {...sectionProps}
        basePairs={basePairs}
        fiatForBinance={fiatForBinance}
        showBinanceFields={!!watchBinanceTracked}
        showUsdtConfig={false}
        initialUsdtMethod="manual"
        noFiatMessage="Seleccione las monedas de origen y destino primero"
      />

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Plus className="h-4 w-4" />
          {isSubmitting ? 'Creando...' : 'Crear'}
        </Button>
      </DialogFooter>
    </form>
  );
}
