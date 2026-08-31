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
        description="Cotizaciones del bot, tratos en curso y entregas pendientes."
      />

      <OperationsStats
        stats={state.stats}
        active={state.filters.needs}
        onPick={(needs) => actions.setFilters({ ...state.filters, needs, segment: 'ALL' })}
      />

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
        page={state.page}
        pageSize={state.pageSize}
        total={state.total}
        totalPages={state.totalPages}
        from={state.from}
        to={state.to}
        onPageChange={actions.setPage}
        onPageSizeChange={actions.setPageSize}
      />
    </div>
  );
}
