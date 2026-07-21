'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import { CurrencyPairData } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildEditDefaults,
  type CurrencyPairFormData,
} from '../../_components/sections/formShared';
import { GeneralSection } from '../../_components/sections/GeneralSection';
import { RateSourceSection } from '../../_components/sections/RateSourceSection';
import { RoundingSection } from '../../_components/sections/RoundingSection';

interface PairDetailFormProps {
  pair: CurrencyPairData;
  basePairs: CurrencyPairData[];
  fiatSymbol: string | null;
  error: string;
  onSave: (data: CurrencyPairFormData) => Promise<boolean>;
}

export function PairDetailForm({
  pair,
  basePairs,
  fiatSymbol,
  error,
  onSave,
}: PairDetailFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CurrencyPairFormData>({ defaultValues: buildEditDefaults(pair) });

  // Evita perder cambios al cerrar la pestaña o navegar fuera del sitio.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const submit = async (data: CurrencyPairFormData) => {
    const saved = await onSave(data);
    // Tras guardar, el formulario deja de estar "sucio" con los valores nuevos.
    if (saved) reset(data);
  };

  const sectionProps = { control, watch, setValue, errors };

  return (
    <form onSubmit={handleSubmit(submit)}>
      <Tabs defaultValue="general">
        <TabsList className="h-auto w-full flex-wrap sm:w-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="rate">Origen de tasa</TabsTrigger>
          <TabsTrigger value="rounding">Redondeo</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 pt-4">
          <GeneralSection {...sectionProps} basePairs={basePairs} />
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-300">
            <strong>Nota:</strong> usa los toggles en la lista principal para cambiar los estados de
            Activo, Monitor y Binance.
          </div>
        </TabsContent>

        <TabsContent value="rate" className="space-y-4 pt-4">
          <RateSourceSection
            {...sectionProps}
            basePairs={basePairs}
            fiatForBinance={fiatSymbol}
            showBinanceFields={pair.binance_tracked}
            initialUsdtMethod={pair.usdt_pair_uuid ? 'dynamic' : 'manual'}
            noFiatMessage="Este par no tiene moneda FIAT válida para Binance"
          />
        </TabsContent>

        <TabsContent value="rounding" className="space-y-4 pt-4">
          <RoundingSection
            {...sectionProps}
            pairUuid={pair.uuid}
            fromSymbol={pair.from_currency.symbol}
            toSymbol={pair.to_currency.symbol}
          />
        </TabsContent>
      </Tabs>

      {error ? (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        {isDirty ? (
          <p className="mr-auto text-xs text-muted-foreground">Tienes cambios sin guardar.</p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || isSubmitting}
          onClick={() => reset(buildEditDefaults(pair))}
        >
          Descartar
        </Button>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
