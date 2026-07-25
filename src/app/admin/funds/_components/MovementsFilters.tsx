'use client';

import { useRef, useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { useDismiss } from '@/hooks/useDismiss';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/lib/dateRange';
import { MovementType, type FundMovementFilters } from '@/types/fund';
import { MOVEMENT_LABELS, MOVEMENT_META } from './movementMeta';

/** Color del punto de cada tipo en el dropdown (coincide con el tono del badge de la fila). */
const DOT_BY_TONE: Record<string, string> = {
  success: 'bg-emerald-500',
  info: 'bg-sky-500',
  warning: 'bg-amber-500',
  neutral: 'bg-muted-foreground',
};

// Orden del dropdown como en el diseño.
const TYPE_ORDER: MovementType[] = [
  MovementType.EXCHANGE,
  MovementType.DEPOSIT,
  MovementType.ADJUSTMENT,
  MovementType.PERSONAL,
];

interface MovementsFiltersProps {
  filters: FundMovementFilters;
  hasActiveFilters: boolean;
  onChange: (filters: FundMovementFilters) => void;
  onReset: () => void;
}

export function MovementsFilters({
  filters,
  hasActiveFilters,
  onChange,
  onReset,
}: MovementsFiltersProps) {
  const typeRef = useRef<HTMLDivElement>(null);
  const [typeOpen, setTypeOpen] = useState(false);

  useDismiss(typeRef, typeOpen, () => setTypeOpen(false));

  const typeLabel = filters.movement_type
    ? MOVEMENT_LABELS[filters.movement_type]
    : 'Todos los tipos';

  const selectType = (t?: MovementType) => {
    onChange({ ...filters, movement_type: t });
    setTypeOpen(false);
  };

  const setDateRange = (range: DateRange) => {
    onChange({ ...filters, date_from: range.from, date_to: range.to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* ---- Tipo ---- */}
      <div ref={typeRef} className="relative">
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-haspopup="menu"
          aria-expanded={typeOpen}
          onClick={() => setTypeOpen((o) => !o)}
          className={cn(
            'h-10 gap-1.5 rounded-lg font-semibold',
            filters.movement_type && 'bg-muted',
            typeOpen && 'border-primary',
          )}
        >
          {typeLabel}
          <ChevronDown className={cn('h-4 w-4 transition-transform', typeOpen && 'rotate-180')} />
        </Button>

        {typeOpen ? (
          <div
            role="menu"
            className="absolute left-0 top-[calc(100%+6px)] z-20 flex w-52 flex-col gap-0.5 rounded-xl border border-border bg-popover p-1.5 shadow-lg"
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={!filters.movement_type}
              onClick={() => selectType(undefined)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                !filters.movement_type
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-foreground hover:bg-muted',
              )}
            >
              Todos los tipos
            </button>
            {TYPE_ORDER.map((t) => {
              const active = filters.movement_type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => selectType(t)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn('h-2 w-2 shrink-0 rounded-full', DOT_BY_TONE[MOVEMENT_META[t].tone])}
                  />
                  {MOVEMENT_LABELS[t]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ---- Rango de fechas (componente reutilizable) ---- */}
      <DateRangeFilter
        value={{ from: filters.date_from, to: filters.date_to }}
        onChange={setDateRange}
      />

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onReset}
          className="h-10 gap-1.5"
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar
        </Button>
      ) : null}
    </div>
  );
}
