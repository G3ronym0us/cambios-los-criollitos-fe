'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClientsStats } from './_components/ClientsStats';
import { ClientsFilters } from './_components/ClientsFilters';
import { ClientsList } from './_components/ClientsList';
import { NewEntityDialog } from './_components/NewEntityDialog';
import { useClients } from './_hooks/useClients';

export default function ClientsAdminPage() {
  const { state, actions } = useClients();
  const [entityOpen, setEntityOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Clientes del bot de WhatsApp: nombres, seguimiento y bloqueos."
        actions={
          <Button variant="outline" onClick={() => setEntityOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo cliente-entidad
          </Button>
        }
      />

      <NewEntityDialog
        open={entityOpen}
        onOpenChange={setEntityOpen}
        onCreate={actions.createEntity}
      />

      <ClientsStats stats={state.stats} />

      <ClientsFilters
        filters={state.filters}
        hasActiveFilters={state.hasActiveFilters}
        onChange={actions.setFilters}
        onReset={actions.resetFilters}
      />

      <ClientsList
        clients={state.clients}
        loading={state.loading}
        error={state.error}
        hasActiveFilters={state.hasActiveFilters}
        hiddenCount={state.hiddenCount}
        onResetFilters={actions.resetFilters}
        onRetry={actions.reload}
      />
    </div>
  );
}
