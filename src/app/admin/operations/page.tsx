'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { OperationsStats } from './_components/OperationsStats';
import { OperationsFilters } from './_components/OperationsFilters';
import { OperationsList } from './_components/OperationsList';
import { useOperations } from './_hooks/useOperations';

export default function OperationsAdminPage() {
  const { state, actions } = useOperations();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operaciones"
        description="Operaciones del bot de WhatsApp: cotizaciones, pendientes y entregas."
      />

      <OperationsStats stats={state.stats} />

      <OperationsFilters
        filters={state.filters}
        hasActiveFilters={state.hasActiveFilters}
        onChange={actions.setFilters}
        onReset={actions.resetFilters}
      />

      <OperationsList
        operations={state.operations}
        loading={state.loading}
        hasActiveFilters={state.hasActiveFilters}
        onResetFilters={actions.resetFilters}
      />
    </div>
  );
}
