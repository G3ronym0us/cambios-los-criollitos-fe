'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClientsStats } from './_components/ClientsStats';
import { ClientsFilters } from './_components/ClientsFilters';
import { ClientsList } from './_components/ClientsList';
import { ClientsPendingSummary } from './_components/ClientsPendingSummary';
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
        pairs={state.pairs}
        onChange={actions.setFilters}
        onReset={actions.resetFilters}
      />

      {/* La franja sólo tiene sentido cuando hay deuda a la vista que resumir. */}
      {!state.pendingLoading && state.pendingSummary.clients > 0 ? (
        <ClientsPendingSummary
          clients={state.pendingSummary.clients}
          totals={state.pendingSummary.totals}
          capped={state.pendingSummary.capped}
          sort={state.sort}
          onSort={actions.setSort}
        />
      ) : null}

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
