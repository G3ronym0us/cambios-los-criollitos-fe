'use client';

import { Controller } from 'react-hook-form';
import { Check } from 'lucide-react';
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
import { NONE, type SectionProps } from './formShared';
import { RoundingPreview } from './RoundingPreview';

interface RoundingSectionProps extends SectionProps {
  /** Símbolos de las monedas del par, para etiquetar "moneda a redondear". */
  fromSymbol: string | null;
  toSymbol: string | null;
  /** Con el uuid del par se previsualiza el efecto usando su tasa actual. */
  pairUuid?: string;
}

export function RoundingSection({
  control,
  watch,
  setValue,
  errors,
  fromSymbol,
  toSymbol,
  pairUuid,
}: RoundingSectionProps) {
  const watchRoundingMode = watch('rounding_mode');
  const watchRoundingStep = watch('rounding_step');
  const watchRoundingDirection = watch('rounding_direction');
  const watchRoundingAmountSide = watch('rounding_amount_side');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Redondeo de cotización</p>
        <p className="text-xs text-muted-foreground">
          Ajusta los montos cotizados de este par. Opcional.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rounding-mode" className="text-xs font-medium text-muted-foreground">
          Modo
        </Label>
        <Controller
          name="rounding_mode"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? NONE}
              onValueChange={(v) => {
                if (v === NONE) {
                  field.onChange(null);
                  setValue('rounding_step', null);
                  setValue('rounding_direction', null);
                  setValue('rounding_amount_side', null);
                  return;
                }
                field.onChange(v as 'RATE' | 'AMOUNT');
                if (!watch('rounding_direction')) setValue('rounding_direction', 'UP');
                if (v === 'RATE') setValue('rounding_amount_side', null);
              }}
            >
              <SelectTrigger id="rounding-mode" className="h-10 w-full">
                {/* El trigger muestra una etiqueta corta; el listado, la explicación completa. */}
                <SelectValue>
                  {(v) => (v === 'RATE' ? 'Tasa' : v === 'AMOUNT' ? 'Monto' : 'Sin redondeo')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin redondeo</SelectItem>
                <SelectItem value="RATE">Tasa — redondea la tasa por unidad</SelectItem>
                <SelectItem value="AMOUNT">Monto — redondea el monto calculado</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {watchRoundingMode ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rounding-step" className="text-xs font-medium text-muted-foreground">
                Múltiplo
              </Label>
              <Controller
                name="rounding_step"
                control={control}
                rules={{
                  validate: (v) =>
                    !watchRoundingMode || (v != null && v > 0) || 'Ingresa un múltiplo mayor a 0',
                }}
                render={({ field }) => (
                  <Input
                    id="rounding-step"
                    type="number"
                    min="0"
                    step="any"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                    }
                    placeholder={watchRoundingMode === 'RATE' ? '5' : '100'}
                  />
                )}
              />
              {errors.rounding_step ? (
                <p className="text-xs text-destructive">{errors.rounding_step.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rounding-direction" className="text-xs font-medium text-muted-foreground">
                Dirección
              </Label>
              <Controller
                name="rounding_direction"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'UP'}
                    onValueChange={(v) => field.onChange(v as 'UP' | 'DOWN')}
                  >
                    <SelectTrigger id="rounding-direction" className="h-10 w-full">
                      <SelectValue>
                        {(v) => (v === 'DOWN' ? 'Hacia abajo' : 'Hacia arriba')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UP">Hacia arriba</SelectItem>
                      <SelectItem value="DOWN">Hacia abajo</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {watchRoundingMode === 'AMOUNT' ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Moneda a redondear</p>
              <Controller
                name="rounding_amount_side"
                control={control}
                rules={{
                  validate: (v) =>
                    watchRoundingMode !== 'AMOUNT' || !!v || 'Selecciona la moneda a redondear',
                }}
                render={({ field }) => (
                  <div
                    role="radiogroup"
                    aria-label="Moneda a redondear"
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    {(
                      [
                        { side: 'FROM', symbol: fromSymbol, hint: 'lo que el cliente entrega' },
                        { side: 'TO', symbol: toSymbol, hint: 'lo que el cliente recibe' },
                      ] as const
                    ).map(({ side, symbol, hint }) => {
                      const selected = field.value === side;
                      return (
                        <button
                          key={side}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(side)}
                          className={cn(
                            'rounded-lg border p-3 text-left transition-colors',
                            selected
                              ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
                              : 'border-border bg-card hover:bg-muted/40'
                          )}
                        >
                          <span
                            className={cn(
                              'flex items-center gap-1.5 font-mono text-sm font-semibold',
                              selected ? 'text-primary' : 'text-foreground'
                            )}
                          >
                            {symbol ?? (side === 'FROM' ? 'Origen' : 'Destino')}
                            {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {errors.rounding_amount_side ? (
                <p className="text-xs text-destructive">{errors.rounding_amount_side.message}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Solo se redondea cuando esa moneda es la que el sistema calcula; si el cliente la
                fija como monto exacto, queda intacta.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Se redondea la tasa por unidad y luego se calculan los montos con la tasa ya
              redondeada.
            </p>
          )}

          {pairUuid && fromSymbol && toSymbol ? (
            <RoundingPreview
              pairUuid={pairUuid}
              fromSymbol={fromSymbol}
              toSymbol={toSymbol}
              mode={watchRoundingMode}
              step={watchRoundingStep}
              direction={watchRoundingDirection}
              amountSide={watchRoundingAmountSide}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
