'use client';

import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/lib/dateRange';
import type { AttentionFilter } from '@/types/payment';
import type { OutgoingClass } from '../_hooks/usePayments';

const OUT_CLASS_LABELS: Record<OutgoingClass, string> = {
  ALL: 'Todos',
  UNLINKED: 'Sin vincular',
  OPERATIONAL: 'Operativos',
  LOAN: 'Préstamos',
  PERSONAL: 'Gastos personales',
  IRRELEVANT: 'Irrelevantes',
};

const ATTENTION_TABS: { value: AttentionFilter; label: string }[] = [
  { value: 'ATTENTION', label: 'Por atender' },
  { value: 'RECONCILED', label: 'Conciliados' },
  { value: 'ALL', label: 'Todos' },
];

interface PaymentsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  showClassification: boolean;
  outClass: OutgoingClass;
  onClassChange: (value: OutgoingClass) => void;
  attention: AttentionFilter;
  onAttentionChange: (value: AttentionFilter) => void;
  range: DateRange;
  onRangeChange: (value: DateRange) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
  shown: number;
  total: number;
}

export function PaymentsFilters({
  search,
  onSearchChange,
  showClassification,
  outClass,
  onClassChange,
  attention,
  onAttentionChange,
  range,
  onRangeChange,
  hasActiveFilters,
  onReset,
  shown,
  total,
}: PaymentsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* En móvil el buscador se lleva la fila entera: compartiéndola con el segmentado
          quedaba en un par de centímetros inservibles. */}
      <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-[340px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cliente, banco, referencia"
          aria-label="Buscar pagos"
          className="h-10 pl-9"
        />
      </div>

      {/* Segmentado: es el mismo eje que la franja de atención de arriba. */}
      <div
        role="group"
        aria-label="Estado de conciliación"
        className="flex h-10 items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5"
      >
        {ATTENTION_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onAttentionChange(t.value)}
            aria-pressed={attention === t.value}
            className={cn(
              'h-full rounded-md px-3 text-xs font-medium transition-colors',
              attention === t.value
                ? 'bg-card font-semibold text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DateRangeFilter value={range} onChange={onRangeChange} label="Todas las fechas" />

      {showClassification ? (
        <Select value={outClass} onValueChange={(value) => onClassChange((value as OutgoingClass) ?? 'ALL')}>
          <SelectTrigger aria-label="Clasificación" className="h-10 w-full sm:w-[180px]">
            <SelectValue>{OUT_CLASS_LABELS[outClass] ?? 'Todos'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(OUT_CLASS_LABELS) as OutgoingClass[]).map((key) => (
              <SelectItem key={key} value={key}>
                {OUT_CLASS_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {hasActiveFilters ? (
        <Button variant="ghost" size="lg" onClick={onReset} className="h-10">
          <RotateCcw className="h-4 w-4" />
          Limpiar
        </Button>
      ) : null}

      {total > 0 ? (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          Mostrando {shown} de {total}
        </span>
      ) : null}
    </div>
  );
}
