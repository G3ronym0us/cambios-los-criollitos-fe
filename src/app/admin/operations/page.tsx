'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { OperationsStats } from './_components/OperationsStats';
import { OperationsFilters } from './_components/OperationsFilters';
import { OperationsList } from './_components/OperationsList';
import { ScenarioEditDialog } from './_components/ScenarioEditDialog';
import { useOperations } from './_hooks/useOperations';
import { useFundGroups } from './_hooks/useFundGroups';
import type { OperationData } from '@/types/operation';

export default function OperationsAdminPage() {
  const { state, actions } = useOperations();
  const { groups } = useFundGroups();
  const [editing, setEditing] = useState<OperationData | null>(null);

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
        onEdit={setEditing}
      />

      <ScenarioEditDialog
        operation={editing}
        groups={groups}
        onClose={() => setEditing(null)}
        onSaved={actions.reload}
      />
    </div>
  );
}
