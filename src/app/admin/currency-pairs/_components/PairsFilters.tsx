'use client';

import { useMemo } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PairType, type CurrencyData } from '@/types/admin';
import { PAIR_TYPE_LABEL } from '../_lib/pairHealth';
import type { PairFilters, PairSegment } from '../_lib/pairFilters';

const ALL_VALUE = '__all__';

const SEGMENTS: { value: PairSegment; label: string }[] = [
  { value: 'alert', label: 'Con alerta' },
  { value: 'active', label: 'Activos' },
  { value: 'all', label: 'Todos' },
];

const TYPES = [PairType.BASE, PairType.DERIVED, PairType.CROSS];

interface PairsFiltersProps {
  filters: PairFilters;
  currencies: CurrencyData[];
  hasActiveFilters: boolean;
  /** «12 de 22» — cuántos pares deja ver el filtro actual. */
  shownCount: number;
  totalCount: number;
  alertCount: number;
  onChange: (filters: PairFilters) => void;
  onReset: () => void;
}

export function PairsFilters({
  filters,
  currencies,
  hasActiveFilters,
  shownCount,
  totalCount,
  alertCount,
  onChange,
  onReset,
}: PairsFiltersProps) {
  const symbols = useMemo(
    () => Array.from(new Set(currencies.map((c) => c.symbol))).sort(),
    [currencies]
  );

  const toggleType = (type: PairType) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onChange({ ...filters, types: next });
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="relative w-full lg:max-w-[16rem]">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="VES, Zelle, Pix…"
          aria-label="Buscar par por símbolo o nombre"
          className="h-10 pl-9"
        />
      </div>

      <div
        role="group"
        aria-label="Filtrar por estado"
        className="flex gap-1 rounded-lg border border-border bg-muted p-1"
      >
        {SEGMENTS.map((segment) => {
          const selected = filters.segment === segment.value;
          return (
            <button
              key={segment.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ ...filters, segment: segment.value })}
              className={cn(
                'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors lg:flex-none',
                selected
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {segment.value === 'alert' && alertCount > 0 ? (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              ) : null}
              {segment.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo de par">
        {TYPES.map((type) => {
          const selected = filters.types.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleType(type)}
              className={cn(
                'min-h-9 rounded-full border px-3 text-xs font-medium transition-colors',
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {PAIR_TYPE_LABEL[type]}
            </button>
          );
        })}
      </div>

      <Select
        value={filters.currency || ALL_VALUE}
        onValueChange={(value) =>
          onChange({ ...filters, currency: value === ALL_VALUE ? '' : (value as string) })
        }
      >
        <SelectTrigger aria-label="Filtrar por moneda" className="h-10 w-full lg:w-[11rem]">
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

      <div className="flex items-center gap-2 lg:ml-auto">
        <span className="text-xs text-muted-foreground tabular-nums">
          {shownCount === totalCount ? `${totalCount} pares` : `${shownCount} de ${totalCount}`}
        </span>
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={onReset} className="min-h-9">
            <RotateCcw className="h-4 w-4" />
            Limpiar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
