'use client';

import { ArrowLeftRight, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { cn } from '@/lib/utils';
import type { CurrencyPairData } from '@/types/admin';
import { PAIR_GRID, PairRow } from './PairRow';

interface PairsListProps {
  pairs: CurrencyPairData[];
  loading: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onCreate: () => void;
  onEdit: (pair: CurrencyPairData) => void;
  onDelete: (uuid: string) => void;
  onShowHistory: (pair: CurrencyPairData) => void;
  onManualRate: (pair: CurrencyPairData) => void;
}

export function PairsList({
  pairs,
  loading,
  hasActiveFilters,
  onResetFilters,
  onCreate,
  ...rowHandlers
}: PairsListProps) {
  if (loading) {
    return <LoadingState label="Cargando pares de monedas..." />;
  }

  if (pairs.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilters ? SlidersHorizontal : ArrowLeftRight}
        title={hasActiveFilters ? 'No hay pares con estos filtros' : 'No hay pares de monedas'}
        description={
          hasActiveFilters
            ? 'Prueba ajustando los filtros o crea un nuevo par de monedas.'
            : 'Comienza creando tu primer par para gestionar las tasas de cambio.'
        }
        actions={
          <>
            {hasActiveFilters ? (
              <Button variant="outline" size="lg" onClick={onResetFilters}>
                <RotateCcw className="h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : null}
            <Button size="lg" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              {hasActiveFilters ? 'Crear nuevo par' : 'Crear primer par'}
            </Button>
          </>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* La cabecera solo existe cuando hay columnas que encabezar. */}
      <div
        className={cn(
          PAIR_GRID,
          'sticky top-0 z-10 hidden border-b border-border bg-muted/60 px-3 py-2 text-[0.65rem] font-bold tracking-wider text-muted-foreground uppercase backdrop-blur lg:grid'
        )}
      >
        <span>Par</span>
        <span>Tasa vigente</span>
        <span>24 h</span>
        <span>Origen</span>
        <span className="sr-only">Acciones</span>
      </div>

      {pairs.map((pair) => (
        <PairRow key={pair.uuid} pair={pair} {...rowHandlers} />
      ))}
    </div>
  );
}
