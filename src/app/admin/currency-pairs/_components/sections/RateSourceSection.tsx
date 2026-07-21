'use client';

import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { CurrencyPairData } from '@/types/admin';
import TradeMethodSelector from '@/components/TradeMethodSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NONE, type SectionProps } from './formShared';

interface RateSourceSectionProps extends SectionProps {
  basePairs: CurrencyPairData[];
  /** Símbolo FIAT del par, o null si no aplica para Binance. */
  fiatForBinance: string | null;
  showBinanceFields: boolean;
  /** 'dynamic' si el par ya venía apuntando a otro par como referencia USDT. */
  initialUsdtMethod: 'manual' | 'dynamic';
  /** Mensaje cuando no hay FIAT válida para Binance (difiere entre crear y editar). */
  noFiatMessage: string;
  /** Al crear el par no se muestra la config USDT: se ajusta luego en su pantalla. */
  showUsdtConfig?: boolean;
}

export function RateSourceSection({
  control,
  watch,
  setValue,
  errors,
  basePairs,
  fiatForBinance,
  showBinanceFields,
  initialUsdtMethod,
  noFiatMessage,
  showUsdtConfig = true,
}: RateSourceSectionProps) {
  const [usdtMethod, setUsdtMethod] = useState<'manual' | 'dynamic'>(initialUsdtMethod);

  const watchUsdtReferenceSide = watch('usdt_reference_side');
  const watchUsdtPairUuid = watch('usdt_pair_uuid');

  return (
    <div className="space-y-4">
      {showUsdtConfig ? (
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
                onValueChange={(v) => field.onChange(v === NONE ? null : (v as 'FROM' | 'TO'))}
              >
                <SelectTrigger id="usdt-reference-side" className="h-10 w-full">
                  <SelectValue>
                    {(v) =>
                      v === 'FROM'
                        ? 'FROM — monto origen'
                        : v === 'TO'
                          ? 'TO — monto destino'
                          : 'Sin configurar'
                    }
                  </SelectValue>
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
                      <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                    )}
                  />
                  <span className="text-sm">Usar tasa inversa (1/rate)</span>
                </label>
              </>
            )}
          </>
        ) : null}
      </div>
      ) : null}

      {showBinanceFields ? (
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">Rastreo en Binance P2P</p>

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
                {noFiatMessage}
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
              rules={{ min: { value: 0.01, message: 'El monto debe ser mayor a 0' } }}
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
        </div>
      ) : null}
    </div>
  );
}
