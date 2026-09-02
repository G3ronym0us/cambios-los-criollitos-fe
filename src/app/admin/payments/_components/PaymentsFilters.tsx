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
import type { AttentionCounts } from '../_lib/attentionCounts';
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
  // Cifras del segmentado (solo móvil). Null mientras la franja no ha contestado.
  counts?: AttentionCounts | null;
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
  counts,
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
          // 44px: es el operador atendiendo la bandeja con el pulgar, no un clic de mouse.
          className="h-11 pl-9"
        />
      </div>

      {/* Segmentado: es el mismo eje que la franja de atención de arriba. En móvil ocupa la
          fila entera y las tres pestañas se reparten el ancho en partes iguales, como en el
          diseño de la bandeja; a partir de `sm` vuelve a ser tan ancho como su contenido para
          convivir con el resto de filtros en una sola fila. */}
      <div
        role="group"
        aria-label="Estado de conciliación"
        className="flex h-11 w-full items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5 sm:w-auto"
      >
        {ATTENTION_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onAttentionChange(t.value)}
            aria-pressed={attention === t.value}
            className={cn(
              'h-full flex-1 whitespace-nowrap rounded-md px-1.5 text-[11.5px] font-medium transition-colors sm:flex-none sm:px-3 sm:text-xs',
              attention === t.value
                ? 'bg-card font-semibold text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {/* La cifra solo en móvil: ahí sustituye a la franja de atención, que en
                escritorio sigue arriba con su desglose. */}
            {counts ? <span className="lg:hidden"> ({counts[t.value]})</span> : null}
          </button>
        ))}
      </div>

      <DateRangeFilter value={range} onChange={onRangeChange} label="Todas las fechas" />

      {showClassification ? (
        <Select value={outClass} onValueChange={(value) => onClassChange((value as OutgoingClass) ?? 'ALL')}>
          <SelectTrigger aria-label="Clasificación" className="h-11 w-full sm:w-[180px]">
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
        <Button variant="ghost" size="lg" onClick={onReset} className="h-11 px-2 text-primary sm:px-4">
          <RotateCcw className="hidden h-4 w-4 sm:block" />
          Limpiar
        </Button>
      ) : null}

      {total > 0 ? (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {/* En 375 px la fila comparte sitio con el rango de fechas y «Limpiar»:
              «Mostrando» sobra, la cifra se entiende sola. */}
          <span className="hidden sm:inline">Mostrando </span>
          {shown} de {total}
        </span>
      ) : null}
    </div>
  );
}
