'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { ClientsStats } from './_components/ClientsStats';
import { ClientsFilters } from './_components/ClientsFilters';
import { ClientsList } from './_components/ClientsList';
import { ClientEditDialog } from './_components/ClientEditDialog';
import { useClients } from './_hooks/useClients';

export default function ClientsAdminPage() {
  const { state, actions } = useClients();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Clientes del bot de WhatsApp: nombres, seguimiento y bloqueos."
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
        hasActiveFilters={state.hasActiveFilters}
        onResetFilters={actions.resetFilters}
        onEdit={actions.openEdit}
        onToggleBlocked={actions.handleToggleBlocked}
      />

      <ClientEditDialog
        client={state.editing}
        submitting={state.submitting}
        onSubmit={actions.handleUpdate}
        onCancel={actions.closeEdit}
      />
    </div>
  );
}
