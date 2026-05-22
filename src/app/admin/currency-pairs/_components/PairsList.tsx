'use client';

import { ArrowLeftRight, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import type { CurrencyPairData } from '@/types/admin';
import { PairItem } from './PairItem';

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
  onToggleActive: (pair: CurrencyPairData) => void;
  onToggleMonitored: (pair: CurrencyPairData) => void;
  onToggleBinance: (pair: CurrencyPairData) => void;
}

export function PairsList({
  pairs,
  loading,
  hasActiveFilters,
  onResetFilters,
  onCreate,
  ...itemHandlers
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
    <div className="grid gap-3 sm:gap-4">
      {pairs.map((pair) => (
        <PairItem key={pair.uuid} pair={pair} {...itemHandlers} />
      ))}
    </div>
  );
}
