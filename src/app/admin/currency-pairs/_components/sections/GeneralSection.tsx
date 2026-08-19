'use client';

import { Controller } from 'react-hook-form';
import { CurrencyPairData, PairType } from '@/types/admin';
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
import { cn } from '@/lib/utils';
import { formatRate } from '../../_lib/pairHealth';
import { PairTypeCards } from '../PairTypeCards';
import type { SectionProps } from './formShared';

interface GeneralSectionProps extends SectionProps {
  basePairs: CurrencyPairData[];
}

export function GeneralSection({
  control,
  watch,
  errors,
  basePairs,
}: GeneralSectionProps) {
  const watchPairType = watch('pair_type');
  const watchBasePairId = watch('base_pair_uuid');
  const watchPercentage = watch('derived_percentage');
  const watchInverse = watch('use_inverse_percentage');

  const selectedBase = basePairs.find((p) => p.uuid === watchBasePairId);
  const baseRate = selectedBase?.current_rate?.rate ?? null;

  // Mismo cálculo que el backend aplica al derivar (`ExchangeRate.create_safe`):
  // el normal multiplica por (1 − pct) y el inverso divide entre (1 − pct).
  const pct = watchPercentage != null ? Number(watchPercentage) / 100 : null;
  const derivedRate =
    baseRate != null && pct != null && pct !== 0 && pct !== 1
      ? watchInverse
        ? baseRate / (1 - pct)
        : baseRate * (1 - pct)
      : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tipo de par</Label>
        <Controller
          name="pair_type"
          control={control}
          rules={{ required: 'Debe seleccionar un tipo de par' }}
          render={({ field }) => (
            <PairTypeCards value={field.value ?? PairType.BASE} onChange={field.onChange} />
          )}
        />
      </div>

      {watchPairType === PairType.DERIVED ? (
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
              No hay pares base disponibles. Cree primero un par BASE activo con rastreo de Binance o
              tasas manuales.
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  baseRate != null ? 'bg-emerald-500' : 'bg-muted-foreground'
                )}
                aria-hidden
              />
              {baseRate != null && selectedBase ? (
                <span>
                  Cotizando ahora a{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {formatRate(baseRate)} {selectedBase.to_currency.symbol}
                  </span>{' '}
                  — solo aparecen bases activos con tasa disponible.
                </span>
              ) : (
                <span>Solo aparecen pares base activos con tasa disponible.</span>
              )}
            </div>
          )}
        </div>
      ) : null}

      {(watchPairType === PairType.DERIVED && watchBasePairId) ||
      watchPairType === PairType.CROSS ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="use-inverse">Dirección</Label>
              <label
                htmlFor="use-inverse"
                className="flex min-h-10 cursor-pointer items-center gap-3"
              >
                <Controller
                  name="use_inverse_percentage"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="use-inverse"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <span className="text-sm">Porcentaje inverso</span>
              </label>
            </div>
          </div>

          {derivedRate != null && selectedBase && pct != null ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Con esta configuración, la tasa del par es{' '}
              <span className="font-mono">
                {formatRate(baseRate!)} {watchInverse ? '÷' : '×'} (1 − {pct})
              </span>{' '}
              ={' '}
              <span className="font-mono font-semibold text-foreground">
                {formatRate(derivedRate)} {selectedBase.to_currency.symbol}
              </span>
              . Cambia sola cuando cambia el base.
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {watchPairType === PairType.DERIVED
                ? 'Porcentaje a aplicar sobre la tasa del par base (0-100%).'
                : 'Porcentaje a aplicar sobre la tasa cruzada calculada (0-100%).'}
            </p>
          )}
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
