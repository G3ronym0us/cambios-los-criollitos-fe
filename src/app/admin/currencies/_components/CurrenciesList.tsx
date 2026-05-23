'use client';

import { Coins, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import type { CurrencyData } from '@/types/admin';
import { CurrencyItem } from './CurrencyItem';

interface CurrenciesListProps {
  currencies: CurrencyData[];
  loading: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onCreate: () => void;
  onEdit: (currency: CurrencyData) => void;
  onDelete: (currency: CurrencyData) => void;
}

export function CurrenciesList({
  currencies,
  loading,
  hasActiveFilters,
  onResetFilters,
  onCreate,
  onEdit,
  onDelete,
}: CurrenciesListProps) {
  if (loading) {
    return <LoadingState label="Cargando monedas..." />;
  }

  if (currencies.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilters ? SlidersHorizontal : Coins}
        title={hasActiveFilters ? 'No hay monedas con estos filtros' : 'No hay monedas registradas'}
        description={
          hasActiveFilters
            ? 'Prueba ajustando los filtros o crea una nueva moneda.'
            : 'Comienza creando tu primera moneda para gestionar pares y transacciones.'
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
              {hasActiveFilters ? 'Crear nueva moneda' : 'Crear primera moneda'}
            </Button>
          </>
        }
      />
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {currencies.map((currency) => (
        <CurrencyItem
          key={currency.uuid}
          currency={currency}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
