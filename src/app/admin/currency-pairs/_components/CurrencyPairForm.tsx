'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Edit, Plus } from 'lucide-react';
import {
  CreateCurrencyPairData,
  CurrencyData,
  CurrencyPairData,
  PairType,
} from '@/types/admin';
import TradeMethodSelector from '@/components/TradeMethodSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';

export type CurrencyPairFormData = CreateCurrencyPairData;

const NONE = '__none__';

const defaultValues: CurrencyPairFormData = {
  from_currency_uuid: '',
  to_currency_uuid: '',
  base_pair_uuid: undefined,
  derived_percentage: null,
  use_inverse_percentage: false,
  description: '',
  is_active: true,
  is_monitored: true,
  binance_tracked: false,
  banks_to_track: [],
  amount_to_track: null,
  pair_type: PairType.BASE,
  usdt_reference_side: null,
  usdt_manual_rate: null,
  usdt_pair_uuid: null,
  usdt_pair_inverse: false,
};

interface CurrencyPairFormProps {
  mode: 'create' | 'edit';
  editingPair?: CurrencyPairData | null;
  currencies: CurrencyData[];
  basePairs: CurrencyPairData[];
  error: string;
  setError: (error: string) => void;
  validateBinanceForm: (data: CurrencyPairFormData) => Promise<boolean>;
  getFiatCurrencyFromPair: (from: string, to: string) => string | null;
  onSubmit: (data: CurrencyPairFormData) => Promise<void>;
  onCancel: () => void;
}

function buildEditDefaults(pair: CurrencyPairData): CurrencyPairFormData {
  const normalizedPairType = (pair.pair_type as string).toUpperCase() as PairType;
  return {
    from_currency_uuid: pair.from_currency_uuid,
    to_currency_uuid: pair.to_currency_uuid,
    base_pair_uuid: pair.base_pair_uuid,
    derived_percentage: pair.derived_percentage,
    use_inverse_percentage: pair.use_inverse_percentage,
    description: pair.description,
    is_active: pair.is_active,
    is_monitored: pair.is_monitored,
    binance_tracked: pair.binance_tracked,
    banks_to_track: pair.banks_to_track || [],
    amount_to_track: pair.amount_to_track,
    pair_type: normalizedPairType,
    usdt_reference_side: pair.usdt_reference_side ?? null,
    usdt_manual_rate: pair.usdt_manual_rate ?? null,
    usdt_pair_uuid: pair.usdt_pair_uuid ?? null,
    usdt_pair_inverse: pair.usdt_pair_inverse ?? false,
  };
}

export function CurrencyPairForm({
  mode,
  editingPair,
  currencies,
  basePairs,
  error,
  setError,
  validateBinanceForm,
  getFiatCurrencyFromPair,
  onSubmit,
  onCancel,
}: CurrencyPairFormProps) {
  const initial = mode === 'edit' && editingPair ? buildEditDefaults(editingPair) : defaultValues;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CurrencyPairFormData>({ defaultValues: initial });

  const watchPairType = watch('pair_type');
  const watchBasePairId = watch('base_pair_uuid');
  const watchBinanceTracked = watch('binance_tracked');
  const watchFromCurrency = watch('from_currency_uuid');
  const watchToCurrency = watch('to_currency_uuid');
  const watchUsdtReferenceSide = watch('usdt_reference_side');
  const watchUsdtPairUuid = watch('usdt_pair_uuid');

  const initialUsdtMethod: 'manual' | 'dynamic' =
    mode === 'edit' && editingPair?.usdt_pair_uuid ? 'dynamic' : 'manual';
  const [usdtMethod, setUsdtMethod] = useState<'manual' | 'dynamic'>(initialUsdtMethod);

  useEffect(() => {
    setError('');
  }, [setError]);

  const fiatForBinance =
    mode === 'edit' && editingPair
      ? getFiatCurrencyFromPair(editingPair.from_currency_uuid, editingPair.to_currency_uuid)
      : getFiatCurrencyFromPair(watchFromCurrency, watchToCurrency);

  const showBinanceFields =
    mode === 'edit' ? !!editingPair?.binance_tracked : !!watchBinanceTracked;

  const submit = async (data: CurrencyPairFormData) => {
    if (mode === 'create' && data.from_currency_uuid === data.to_currency_uuid) {
      setError('Las monedas de origen y destino deben ser diferentes');
      return;
    }
    const valid = await validateBinanceForm(data);
    if (!valid) return;
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {mode === 'edit' && editingPair ? (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Par</p>
          <p className="font-medium text-foreground">{editingPair.display_name}</p>
        </div>
      ) : null}

      {mode === 'create' ? (
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
                <SelectValue />
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
      ) : null}

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
              No hay pares base disponibles. Cree primero un par BASE activo con rastreo de Binance o tasas manuales.
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Todos los pares mostrados ya están validados por el sistema.
            </p>
          )}
        </div>
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
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
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

      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium">Configuración USDT</p>

        <div className="space-y-1.5">
          <Label htmlFor="usdt-reference-side" className="text-xs font-medium text-muted-foreground">
            Lado de referencia
          </Label>
          <Controller
            name="usdt_reference_side"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? NONE}
                onValueChange={(v) =>
                  field.onChange(v === NONE ? null : (v as 'FROM' | 'TO'))
                }
              >
                <SelectTrigger id="usdt-reference-side" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin configurar</SelectItem>
                  <SelectItem value="FROM">FROM — monto origen</SelectItem>
                  <SelectItem value="TO">TO — monto destino</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {watchUsdtReferenceSide ? (
          <>
            <RadioGroup
              value={usdtMethod}
              onValueChange={(v: string) => {
                const next = v as 'manual' | 'dynamic';
                setUsdtMethod(next);
                if (next === 'manual') setValue('usdt_pair_uuid', null);
                else setValue('usdt_manual_rate', null);
              }}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="manual" />
                Tasa fija
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="dynamic" />
                Par dinámico
              </label>
            </RadioGroup>

            {usdtMethod === 'manual' ? (
              <div className="space-y-1.5">
                <Label htmlFor="usdt-manual-rate" className="text-xs font-medium text-muted-foreground">
                  Tasa USDT fija
                </Label>
                <Controller
                  name="usdt_manual_rate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="usdt-manual-rate"
                      type="number"
                      step="0.000001"
                      min="0"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                      }
                      placeholder="Ej: 1.0 para Zelle (1:1 con USDT)"
                    />
                  )}
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="usdt-pair" className="text-xs font-medium text-muted-foreground">
                    Par de referencia
                  </Label>
                  <Controller
                    name="usdt_pair_uuid"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? NONE}
                        onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                      >
                        <SelectTrigger id="usdt-pair" className="h-10 w-full">
                          <SelectValue placeholder="Seleccionar par..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin configurar</SelectItem>
                          {basePairs.map((p) => (
                            <SelectItem key={p.uuid} value={p.uuid}>
                              {p.pair_symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {watchUsdtPairUuid ? (
                    <p className="text-xs text-muted-foreground">Tasa del par seleccionado.</p>
                  ) : null}
                </div>

                <label className="flex min-h-11 items-center gap-3">
                  <Controller
                    name="usdt_pair_inverse"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <span className="text-sm">Usar tasa inversa (1/rate)</span>
                </label>
              </>
            )}
          </>
        ) : null}
      </div>

      {mode === 'create' ? (
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
      ) : (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-300">
          <strong>Nota:</strong> usa los toggles en la lista principal para cambiar los estados de Activo, Monitor y Binance.
        </div>
      )}

      {showBinanceFields ? (
        <>
          <div className="space-y-1.5">
            <Label>
              Métodos de pago de Binance <span className="text-destructive">*</span>
            </Label>
            {fiatForBinance ? (
              <Controller
                name="banks_to_track"
                control={control}
                render={({ field }) => (
                  <TradeMethodSelector
                    selectedMethods={field.value || []}
                    onChange={field.onChange}
                    fiatCurrency={fiatForBinance}
                    className="w-full"
                  />
                )}
              />
            ) : (
              <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
                {mode === 'edit'
                  ? 'Este par no tiene moneda FIAT válida para Binance'
                  : 'Seleccione las monedas de origen y destino primero'}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount-to-track">
              Monto a trackear <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="amount_to_track"
              control={control}
              rules={{
                min: { value: 0.01, message: 'El monto debe ser mayor a 0' },
              }}
              render={({ field }) => (
                <Input
                  id="amount-to-track"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="0.00"
                />
              )}
            />
            {errors.amount_to_track ? (
              <p className="text-xs text-destructive">{errors.amount_to_track.message}</p>
            ) : null}
          </div>
        </>
      ) : null}

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
          {mode === 'create' ? <Plus className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
          {isSubmitting
            ? mode === 'create'
              ? 'Creando...'
              : 'Actualizando...'
            : mode === 'create'
              ? 'Crear'
              : 'Actualizar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
