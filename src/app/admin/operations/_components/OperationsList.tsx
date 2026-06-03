'use client';

import { FileText, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import type { OperationData } from '@/types/operation';
import { OperationItem } from './OperationItem';

interface OperationsListProps {
  operations: OperationData[];
  loading: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function OperationsList({
  operations,
  loading,
  hasActiveFilters,
  onResetFilters,
}: OperationsListProps) {
  if (loading) {
    return <LoadingState label="Cargando operaciones..." />;
  }

  if (operations.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilters ? SlidersHorizontal : FileText}
        title={hasActiveFilters ? 'No hay operaciones con estos filtros' : 'Aún no hay operaciones'}
        description={
          hasActiveFilters
            ? 'Prueba ajustando los filtros de búsqueda.'
            : 'Las operaciones se crean cuando un cliente cotiza con el bot de WhatsApp.'
        }
        actions={
          hasActiveFilters ? (
            <Button variant="outline" size="lg" onClick={onResetFilters}>
              <RotateCcw className="h-4 w-4" />
              Limpiar filtros
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
      {operations.map((op) => (
        <OperationItem key={op.uuid} operation={op} />
      ))}
    </div>
  );
}
