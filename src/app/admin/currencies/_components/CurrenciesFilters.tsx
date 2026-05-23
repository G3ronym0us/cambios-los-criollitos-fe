'use client';

import { RotateCcw, Search } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyType } from '@/types/admin';
import type { CurrenciesFilters as Filters } from '../_hooks/useCurrencies';

interface CurrenciesFiltersProps {
  filters: Filters;
  hasActiveFilters: boolean;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function CurrenciesFilters({
  filters,
  hasActiveFilters,
  onChange,
  onReset,
}: CurrenciesFiltersProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
        <div className="flex flex-1 flex-col gap-1.5 sm:min-w-[240px]">
          <Label htmlFor="currency-search" className="text-xs uppercase tracking-wide text-muted-foreground">
            Buscar
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="currency-search"
              type="search"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Nombre, símbolo o descripción"
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:min-w-[180px]">
          <Label htmlFor="currency-type-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
            Tipo
          </Label>
          <Select
            value={filters.type as string}
            onValueChange={(value) =>
              onChange({ ...filters, type: value as Filters['type'] })
            }
          >
            <SelectTrigger id="currency-type-filter" className="h-10 w-full sm:w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value={CurrencyType.FIAT}>Fiat</SelectItem>
              <SelectItem value={CurrencyType.CRYPTO}>Crypto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters ? (
          <Button variant="ghost" size="lg" onClick={onReset} className="sm:ml-auto">
            <RotateCcw className="h-4 w-4" />
            Limpiar filtros
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
