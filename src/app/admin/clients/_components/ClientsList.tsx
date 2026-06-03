'use client';

import { Contact, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import type { ClientData } from '@/types/client';
import { ClientItem } from './ClientItem';

interface ClientsListProps {
  clients: ClientData[];
  loading: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onEdit: (client: ClientData) => void;
  onToggleBlocked: (client: ClientData) => void;
}

export function ClientsList({
  clients,
  loading,
  hasActiveFilters,
  onResetFilters,
  onEdit,
  onToggleBlocked,
}: ClientsListProps) {
  if (loading) {
    return <LoadingState label="Cargando clientes..." />;
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
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
      {clients.map((client) => (
        <ClientItem
          key={client.uuid}
          client={client}
          onEdit={onEdit}
          onToggleBlocked={onToggleBlocked}
        />
      ))}
    </div>
  );
}
