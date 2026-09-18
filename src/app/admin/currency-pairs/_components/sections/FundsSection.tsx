'use client';

import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Info, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FundGroup } from '@/types/fund';
import { NONE, type CurrencyPairFormData, type SectionProps } from './formShared';

interface FundsSectionProps extends SectionProps {
  funds: FundGroup[];
  fromSymbol: string;
  toSymbol: string;
}

type FundField = 'default_fund_in_uuid' | 'default_fund_out_uuid';
type PctField = 'default_fund_in_profit_pct' | 'default_fund_out_profit_pct';

interface FundRowProps extends Pick<SectionProps, 'control'> {
  id: string;
  label: string;
  fundField: FundField;
  pctField: PctField;
  funds: FundGroup[];
}

function FundRow({ id, label, fundField, pctField, funds, control }: FundRowProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-fund`}>{label}</Label>
        <Controller
          name={fundField}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || NONE}
              onValueChange={(v) => field.onChange(!v || v === NONE ? null : v)}
            >
              <SelectTrigger id={`${id}-fund`} className="h-10 w-full">
                <SelectValue placeholder="Sin fondo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin fondo</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.uuid} value={fund.uuid}>
                    {fund.name}
                    {fund.currency ? ` · ${fund.currency}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-pct`}>% del margen</Label>
        <Controller
          name={pctField}
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-1">
              <Input
                id={`${id}-pct`}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.5"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="—"
                className="h-10"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          )}
        />
      </div>
    </div>
  );
}

/**
 * Fondo por defecto del par. Es lo que toma una operación nueva cuando nadie eligió fondo a
 * mano ni lo trae el comprobante: la moneda sola no dice nada del negocio (USD-VES es
 * efectivo, no Zelle). Los porcentajes son la meta y se aplican tal cual aunque se cobre
 * distinto; en cada operación se pueden ajustar a lo cobrado.
 */
export function FundsSection({
  control,
  watch,
  setValue,
  funds,
  fromSymbol,
  toSymbol,
}: FundsSectionProps) {
  const fundOut = watch('default_fund_out_uuid');
  const [showOut, setShowOut] = useState(!!fundOut);

  const pctIn = watch('default_fund_in_profit_pct');
  const pctOut = watch('default_fund_out_profit_pct');
  const total = (Number(pctIn) || 0) + (showOut ? Number(pctOut) || 0 : 0);

  const clear = (name: keyof CurrencyPairFormData) =>
    setValue(name, null, { shouldDirty: true });

  const removeOut = () => {
    clear('default_fund_out_uuid');
    clear('default_fund_out_profit_pct');
    setShowOut(false);
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium">
          <PiggyBank className="h-4 w-4 text-muted-foreground" aria-hidden />
          Fondos
        </p>
        <p className="text-xs text-muted-foreground">
          A qué fondo va una operación nueva de {fromSymbol} a {toSymbol} cuando el comprobante no
          trae uno. Sin fondo, la operación nace sin fondo.
        </p>
      </div>

      <FundRow
        id="fund-in"
        label={`Entra (${fromSymbol})`}
        fundField="default_fund_in_uuid"
        pctField="default_fund_in_profit_pct"
        funds={funds}
        control={control}
      />

      {showOut ? (
        <div className="space-y-2">
          <FundRow
            id="fund-out"
            label={`Sale (${toSymbol})`}
            fundField="default_fund_out_uuid"
            pctField="default_fund_out_profit_pct"
            funds={funds}
            control={control}
          />
          <Button type="button" variant="ghost" size="sm" onClick={removeOut}>
            <Trash2 className="h-4 w-4" />
            Quitar fondo de salida
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowOut(true)}>
          <Plus className="h-4 w-4" />
          Agregar fondo de salida
        </Button>
      )}

      {total > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold tabular-nums text-foreground">{total}% en total</span>.
            Se reparte tal cual aunque a la operación se le cobre distinto; en cada operación se
            puede ajustar a lo cobrado.
          </span>
        </div>
      ) : null}
    </div>
  );
}
