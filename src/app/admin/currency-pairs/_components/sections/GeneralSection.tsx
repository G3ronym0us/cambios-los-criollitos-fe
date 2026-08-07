'use client';

import { Controller } from 'react-hook-form';
import { Check } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { formatRate } from '../../_lib/pairHealth';
import type { SectionProps } from './formShared';

interface GeneralSectionProps extends SectionProps {
  /** Solo al crear: permite elegir las monedas del par (en edición ya no se pueden cambiar). */
  currencies?: CurrencyData[];
  basePairs: CurrencyPairData[];
}

const PAIR_TYPE_OPTIONS: { value: PairType; label: string; hint: string }[] = [
  { value: PairType.BASE, label: 'Base', hint: 'Directo de Binance P2P (FIAT-CRYPTO)' },
  { value: PairType.DERIVED, label: 'Derivado', hint: 'De un par base, con porcentaje' },
  { value: PairType.CROSS, label: 'Cruzado', hint: 'Entre dos FIAT vía USDT' },
];

/**
 * El tipo de par decide toda la pantalla, así que se elige entre tres tarjetas
 * con su explicación a la vista y no dentro de un select que hay que abrir.
 */
function PairTypeCards({
  value,
  onChange,
}: {
  value: PairType;
  onChange: (value: PairType) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Tipo de par" className="grid gap-2 sm:grid-cols-3">
      {PAIR_TYPE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
                : 'border-border bg-card hover:bg-muted/40'
            )}
          >
            <span
              className={cn(
                'flex items-center gap-1.5 text-sm font-semibold',
                selected ? 'text-primary' : 'text-foreground'
              )}
            >
              {option.label}
              {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {option.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
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
