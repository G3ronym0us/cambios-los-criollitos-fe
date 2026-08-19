'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ArrowRight } from 'lucide-react';
import { CurrencyData, CurrencyPairData, PairType } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { defaultValues, type CurrencyPairFormData } from './sections/formShared';
import { CurrencyPairField } from './CurrencyPairField';
import { PairTypeCards } from './PairTypeCards';

export type { CurrencyPairFormData };

interface CurrencyPairFormProps {
  currencies: CurrencyData[];
  /** Todos los pares que ya existen: apagan las combinaciones de moneda duplicadas. */
  existingPairs: CurrencyPairData[];
  error: string;
  setError: (error: string) => void;
  onSubmit: (data: CurrencyPairFormData) => Promise<void>;
  onCancel: () => void;
}

/**
 * Formulario de CREACIÓN de un par: solo lo esencial.
 *
 * Las monedas, el tipo y para qué sirve — nada más. El par base, el porcentaje, el rastreo
 * de Binance, la conversión a USDT y el redondeo se configuran después en
 * `/admin/currency-pairs/[uuid]`, adonde lleva el propio botón de crear. Meter todo eso aquí
 * obligaba a decidir de golpe cosas que dependen de que el par ya exista (por ejemplo, qué
 * par base usar), y dejaba un diálogo largo para lo que son tres datos.
 */
export function CurrencyPairForm({
  currencies,
  existingPairs,
  error,
  setError,
  onSubmit,
  onCancel,
}: CurrencyPairFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<CurrencyPairFormData>({ defaultValues });

  const fromUuid = watch('from_currency_uuid');
  const toUuid = watch('to_currency_uuid');
  const pairType = watch('pair_type') ?? PairType.BASE;
  const description = watch('description');

  useEffect(() => {
    setError('');
  }, [setError]);

  /**
   * Qué falta para poder crear, en una frase.
   *
   * Va junto al botón en vez de repartido en errores bajo cada campo: el operador que llega
   * al pie quiere saber por qué no puede seguir, y el orden de las comprobaciones es el
   * orden en que se rellena el formulario.
   */
  const missing = !fromUuid
    ? 'Falta la moneda de origen'
    : !toUuid
      ? 'Falta la moneda de destino'
      : fromUuid === toUuid
        ? 'El origen y el destino deben ser monedas distintas'
        : !description?.trim()
          ? 'Falta la descripción'
          : null;

  const submit = async (data: CurrencyPairFormData) => {
    if (missing) return;
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <CurrencyPairField
        currencies={currencies}
        existingPairs={existingPairs}
        fromUuid={fromUuid}
        toUuid={toUuid}
        pairType={pairType}
        onChange={({ from, to }) => {
          setValue('from_currency_uuid', from, { shouldDirty: true });
          setValue('to_currency_uuid', to, { shouldDirty: true });
        }}
      />

      <div className="space-y-1.5">
        <Label>Tipo de par</Label>
        <Controller
          name="pair_type"
          control={control}
          rules={{ required: 'Debe seleccionar un tipo de par' }}
          render={({ field }) => (
            <PairTypeCards
              layout="stack"
              value={field.value ?? PairType.BASE}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Descripción <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="description"
          control={control}
          rules={{ required: 'La descripción es requerida' }}
          render={({ field }) => (
            <Textarea
              id="description"
              rows={2}
              placeholder="Para qué se usa este par y quién lo cotiza…"
              {...field}
              value={field.value ?? ''}
            />
          )}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <DialogFooter>
        {missing ? (
          <span className="mr-auto text-xs text-muted-foreground">{missing}</span>
        ) : null}
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !!missing}>
          {isSubmitting ? 'Creando…' : 'Crear y configurar'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </DialogFooter>
    </form>
  );
}
