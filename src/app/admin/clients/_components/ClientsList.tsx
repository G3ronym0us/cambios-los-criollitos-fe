'use client';

import { AlertTriangle, Contact, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ClientRow } from '../_hooks/useClients';
import { ClientItem } from './ClientItem';

interface ClientsListProps {
  clients: ClientRow[];
  loading: boolean;
  error: string | null;
  hasActiveFilters: boolean;
  hiddenCount: number;
  onResetFilters: () => void;
  onRetry: () => void;
}

function ClientSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:px-5">
      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function ClientsList({
  clients,
  loading,
  error,
  hasActiveFilters,
  hiddenCount,
  onResetFilters,
  onRetry,
}: ClientsListProps) {
  if (loading) {
    return (
      <div aria-busy aria-label="Cargando clientes">
        {Array.from({ length: 8 }, (_, i) => (
          <ClientSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
      <EmptyState
        icon={AlertTriangle}
        title="No se pudieron cargar los clientes"
        description={error}
        actions={
          <Button variant="outline" size="lg" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </Button>
        }
      />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="p-4 sm:p-6">
      <EmptyState
        icon={hasActiveFilters ? SlidersHorizontal : Contact}
        title={hasActiveFilters ? 'No hay clientes con estos filtros' : 'Aún no hay clientes'}
        description={
          hasActiveFilters
            ? 'Prueba ajustando los filtros de búsqueda.'
            : 'Los clientes se crean automáticamente cuando escriben al bot de WhatsApp.'
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
      </div>
    );
  }

  return (
    <>
      {clients.map(({ client, totals }) => (
        <ClientItem key={client.uuid} client={client} pending={totals} />
      ))}
      {hiddenCount > 0 ? (
        <p className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground sm:px-5">
          Hay {hiddenCount} cliente{hiddenCount === 1 ? '' : 's'} más que no se cargaron y no
          aparecen en la búsqueda.
        </p>
      ) : null}
    </>
  );
}
