'use client';

import { Controller } from 'react-hook-form';
import { CurrencyData, CurrencyPairData, PairType } from '@/types/admin';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SectionProps } from './formShared';

interface GeneralSectionProps extends SectionProps {
  /** Solo al crear: permite elegir las monedas del par (en edición ya no se pueden cambiar). */
  currencies?: CurrencyData[];
  basePairs: CurrencyPairData[];
}

export function GeneralSection({
  control,
  watch,
  errors,
  currencies,
  basePairs,
}: GeneralSectionProps) {
  const watchPairType = watch('pair_type');
  const watchBasePairId = watch('base_pair_uuid');

  return (
    <div className="space-y-4">
      {currencies ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="from-currency">
              Moneda de origen <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="from_currency_uuid"
              control={control}
              rules={{ validate: (value) => !!value || 'Debe seleccionar una moneda válida' }}
              render={({ field }) => (
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger id="from-currency" className="h-10 w-full">
                    <SelectValue placeholder="Seleccionar moneda..." />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.uuid} value={currency.uuid}>
                        {currency.name} ({currency.symbol}) — {currency.currency_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.from_currency_uuid ? (
              <p className="text-xs text-destructive">{errors.from_currency_uuid.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="to-currency">
              Moneda de destino <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="to_currency_uuid"
              control={control}
              rules={{ validate: (value) => !!value || 'Debe seleccionar una moneda válida' }}
              render={({ field }) => (
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger id="to-currency" className="h-10 w-full">
                    <SelectValue placeholder="Seleccionar moneda..." />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.uuid} value={currency.uuid}>
                        {currency.name} ({currency.symbol}) — {currency.currency_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.to_currency_uuid ? (
              <p className="text-xs text-destructive">{errors.to_currency_uuid.message}</p>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="pair-type">Tipo de par</Label>
        <Controller
          name="pair_type"
          control={control}
          rules={{ required: 'Debe seleccionar un tipo de par' }}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="pair-type" className="h-10 w-full">
                <SelectValue>
                  {(v) =>
                    v === PairType.DERIVED
                      ? 'Derivado'
                      : v === PairType.CROSS
                        ? 'Cruzado'
                        : 'Base'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PairType.BASE}>Base — directamente de Binance (FIAT-CRYPTO)</SelectItem>
                <SelectItem value={PairType.DERIVED}>Derivado — derivado de un base con porcentaje</SelectItem>
                <SelectItem value={PairType.CROSS}>Cruzado — entre dos FIATs vía USDT</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Seleccione el tipo de par según su método de cálculo.
        </p>
      </div>

      {watchPairType === PairType.DERIVED ? (
        <>
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-700 dark:text-sky-300">
            <p>
              <strong>Información:</strong> solo se muestran pares BASE activos con tasas disponibles.
              Los pares en el selector cumplen todas estas condiciones:
            </p>
            <ul className="ml-4 mt-2 list-disc text-xs">
              <li>
                Tipo: <code className="rounded bg-sky-500/20 px-1 py-0.5">pair_type = BASE</code>
              </li>
              <li>
                Estado: <code className="rounded bg-sky-500/20 px-1 py-0.5">is_active = true</code>
              </li>
              <li>
                Tasas: <code className="rounded bg-sky-500/20 px-1 py-0.5">binance_tracked = true</code> o tasas manuales activas
              </li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="base-pair">
              Par base <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="base_pair_uuid"
              control={control}
              rules={{
                required: watchPairType === PairType.DERIVED ? 'Debe seleccionar un par base' : false,
              }}
              render={({ field }) => (
                <Select
                  value={field.value || ''}
                  onValueChange={(v) => field.onChange(v || null)}
                  disabled={basePairs.length === 0}
                >
                  <SelectTrigger id="base-pair" className="h-10 w-full">
                    <SelectValue
                      placeholder={
                        basePairs.length === 0
                          ? 'No hay pares base disponibles'
                          : 'Seleccione un par base...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {basePairs.map((pair) => (
                      <SelectItem key={pair.uuid} value={pair.uuid}>
                        {pair.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.base_pair_uuid ? (
              <p className="text-xs text-destructive">{errors.base_pair_uuid.message}</p>
            ) : null}
            {basePairs.length === 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                No hay pares base disponibles. Cree primero un par BASE activo con rastreo de Binance o tasas manuales.
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Todos los pares mostrados ya están validados por el sistema.
              </p>
            )}
          </div>
        </>
      ) : null}

      {(watchPairType === PairType.DERIVED && watchBasePairId) || watchPairType === PairType.CROSS ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="derived-percentage">
              {watchPairType === PairType.DERIVED
                ? 'Porcentaje derivado (%)'
                : 'Porcentaje ajuste (%) — opcional'}
            </Label>
            <Controller
              name="derived_percentage"
              control={control}
              rules={{
                min: { value: 0, message: 'El porcentaje debe ser mayor o igual a 0' },
                max: { value: 100, message: 'El porcentaje debe ser menor o igual a 100' },
              }}
              render={({ field }) => (
                <Input
                  id="derived-percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="5.50"
                />
              )}
            />
            {errors.derived_percentage ? (
              <p className="text-xs text-destructive">{errors.derived_percentage.message}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {watchPairType === PairType.DERIVED
                ? 'Porcentaje a aplicar sobre la tasa del par base (0-100%).'
                : 'Porcentaje a aplicar sobre la tasa cruzada calculada (0-100%).'}
            </p>
          </div>

          <label className="flex min-h-11 items-center gap-3">
            <Controller
              name="use_inverse_percentage"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
              )}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">Usar porcentaje inverso</span>
              <span className="text-xs text-muted-foreground">
                Aplicar porcentaje en dirección contraria.
              </span>
            </span>
          </label>
        </>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Descripción <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="description"
          control={control}
          rules={{ required: 'La descripción es requerida' }}
          render={({ field }) => (
            <Textarea id="description" rows={3} {...field} value={field.value ?? ''} />
          )}
        />
        {errors.description ? (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        ) : null}
      </div>
    </div>
  );
}
