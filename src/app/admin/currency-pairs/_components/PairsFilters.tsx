'use client';

import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { CurrencyData } from '@/types/admin';
import type { CurrencyPairsFilters } from '../_hooks/useCurrencyPairs';

const ALL_VALUE = '__all__';

interface PairsFiltersProps {
  filters: CurrencyPairsFilters;
  currencies: CurrencyData[];
  hasActiveFilters: boolean;
  onChange: (filters: CurrencyPairsFilters) => void;
  onReset: () => void;
}

export function PairsFilters({
  filters,
  currencies,
  hasActiveFilters,
  onChange,
  onReset,
}: PairsFiltersProps) {
  const symbols = useMemo(
    () => Array.from(new Set(currencies.map((c) => c.symbol))).sort(),
    [currencies]
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <label className="flex min-h-11 items-center gap-3">
          <Switch
            checked={filters.activeOnly}
            onCheckedChange={(checked) => onChange({ ...filters, activeOnly: checked })}
          />
          <span className="text-sm font-medium">Solo activos</span>
        </label>

        <label className="flex min-h-11 items-center gap-3">
          <Switch
            checked={filters.monitoredOnly}
            onCheckedChange={(checked) => onChange({ ...filters, monitoredOnly: checked })}
          />
          <span className="text-sm font-medium">Solo monitoreados</span>
        </label>

        <div className="flex flex-1 flex-col gap-1.5 sm:flex-none sm:min-w-[200px]">
          <Label htmlFor="currency-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
            Moneda
          </Label>
          <Select
            value={filters.currency || ALL_VALUE}
            onValueChange={(value) =>
              onChange({ ...filters, currency: value === ALL_VALUE ? '' : (value as string) })
            }
          >
            <SelectTrigger id="currency-filter" className="h-10 w-full sm:w-[200px]">
              <SelectValue placeholder="Todas las monedas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas las monedas</SelectItem>
              {symbols.map((sym) => (
                <SelectItem key={sym} value={sym}>
                  {sym}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters ? (
          <Button variant="ghost" size="lg" onClick={onReset} className="ml-auto self-end">
            <RotateCcw className="h-4 w-4" />
            Limpiar filtros
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
