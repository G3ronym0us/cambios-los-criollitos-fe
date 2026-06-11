'use client';

import { AlertTriangle, Contact, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ClientData } from '@/types/client';
import { ClientItem } from './ClientItem';

interface ClientsListProps {
  clients: ClientData[];
  loading: boolean;
  error: string | null;
  hasActiveFilters: boolean;
  hiddenCount: number;
  onResetFilters: () => void;
  onRetry: () => void;
}

function ClientSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4 sm:p-6">
        <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </CardContent>
    </Card>
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
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2" aria-busy aria-label="Cargando clientes">
        {Array.from({ length: 6 }, (_, i) => (
          <ClientSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (clients.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {clients.map((client) => (
          <ClientItem key={client.uuid} client={client} />
        ))}
      </div>
      {hiddenCount > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          Hay {hiddenCount} cliente{hiddenCount === 1 ? '' : 's'} más que no se cargaron y no
          aparecen en la búsqueda.
        </p>
      ) : null}
    </div>
  );
}
