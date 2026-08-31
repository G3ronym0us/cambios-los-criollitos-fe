'use client';

import { Controller } from 'react-hook-form';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  formatNegotiationStep,
  negotiationReferenceAmount,
  suggestNegotiationSteps,
} from '../../_lib/negotiationStep';
import type { SectionProps } from './formShared';

interface NegotiationStepFieldProps
  extends Pick<SectionProps, 'control' | 'watch' | 'setValue'> {
  fromSymbol: string | null;
  toSymbol: string | null;
  /** Tasa vigente del par. Solo se usa para proponer atajos con la magnitud correcta. */
  currentRate?: number | null;
}

/**
 * «Múltiplo de negociación» — en qué cifras se habla con el cliente en este par.
 *
 * Vive fuera del bloque de redondeo a propósito: no depende de que el par tenga
 * redondeo configurado, porque no lo aplica el bot. Ver `_lib/negotiationStep.ts`.
 */
export function NegotiationStepField({
  control,
  watch,
  setValue,
  fromSymbol,
  toSymbol,
  currentRate,
}: NegotiationStepFieldProps) {
  const step = watch('negotiation_step');
  // Se negocia por defecto en lo que el cliente recibe, que es como se pide.
  const side = watch('negotiation_step_side') ?? 'TO';
  const suggestions = suggestNegotiationSteps(negotiationReferenceAmount(currentRate, side));
  const sideSymbol = side === 'FROM' ? fromSymbol : toSymbol;

  const applyStep = (value: number | null) => {
    setValue('negotiation_step', value, { shouldDirty: true });
    // El lado solo tiene sentido con un múltiplo puesto.
    setValue('negotiation_step_side', value == null ? null : side, { shouldDirty: true });
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            Múltiplo de negociación{' '}
            <span className="font-normal text-muted-foreground">· opcional</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            En qué cifras se habla con el cliente en este par. No se aplica solo: alimenta las
            sugerencias de monto redondo al crear una cotización a mano.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 sm:w-44">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label htmlFor="negotiation-step" className="sr-only">
                Múltiplo de negociación
              </Label>
              <Controller
                name="negotiation_step"
                control={control}
                render={({ field }) => (
                  <Input
                    id="negotiation-step"
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      applyStep(e.target.value ? parseFloat(e.target.value) : null)
                    }
                    onBlur={field.onBlur}
                    placeholder="10.000"
                    className="tabular-nums"
                  />
                )}
              />
            </div>

            <div>
              <Label htmlFor="negotiation-step-side" className="sr-only">
                Moneda en la que se negocia
              </Label>
              <Controller
                name="negotiation_step_side"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'TO'}
                    onValueChange={(v) => field.onChange(v as 'FROM' | 'TO')}
                  >
                    <SelectTrigger id="negotiation-step-side" className="h-10 w-full">
                      <SelectValue>
                        {(v) => (
                          <span className="font-mono text-xs">
                            {v === 'FROM' ? (fromSymbol ?? 'Origen') : (toSymbol ?? 'Destino')}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FROM">
                        <span className="font-mono">{fromSymbol ?? 'Origen'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          lo que el cliente entrega
                        </span>
                      </SelectItem>
                      <SelectItem value="TO">
                        <span className="font-mono">{toSymbol ?? 'Destino'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          lo que el cliente recibe
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            {suggestions.map((value) => {
              const selected = step === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => applyStep(value)}
                  className={cn(
                    'min-h-11 rounded-full border px-3 text-xs tabular-nums transition-colors sm:min-h-8',
                    selected
                      ? 'border-primary bg-primary/5 font-semibold text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted/60'
                  )}
                >
                  {formatNegotiationStep(value)}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={step == null}
              onClick={() => applyStep(null)}
              className={cn(
                'min-h-11 rounded-full border px-3 text-xs transition-colors sm:min-h-8',
                step == null
                  ? 'border-primary bg-primary/5 font-semibold text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/60'
              )}
            >
              ninguno
            </button>
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-md border border-border bg-card p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          No confundir con el <span className="font-medium text-foreground">Múltiplo</span> de
          arriba: aquel lo aplica el bot en cada cotización, este solo <em>sugiere</em> y el
          operador decide. Pueden ser distintos — <span className="font-mono whitespace-nowrap">USD/VES</span>{' '}
          redondea la tasa a 5 y se negocia en dólares de 5 en 5;{' '}
          <span className="font-mono whitespace-nowrap">VES/COP</span> redondea el monto a 100 COP
          pero se habla en pesos de 10.000.
          {step != null && sideSymbol ? (
            <>
              {' '}Aquí se sugerirán montos de{' '}
              <span className="font-medium text-foreground tabular-nums">
                {formatNegotiationStep(step)} {sideSymbol}
              </span>{' '}
              en adelante.
            </>
          ) : null}
        </span>
      </p>
    </div>
  );
}
