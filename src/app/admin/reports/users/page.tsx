'use client';

import { Suspense } from 'react';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProfitStats } from '../_shared/ProfitStats';
import { ProfitTransactionsList } from '../_shared/ProfitTransactionsList';
import { UserReportFilters } from './_components/UserReportFilters';
import { useUserReport } from './_hooks/useUserReport';

function UserReportContent() {
  const { state, actions } = useUserReport();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporte por usuario"
        description="Ganancias de un usuario específico en un rango de fechas."
      />

      <UserReportFilters
        users={state.users}
        selectedUserUuid={state.selectedUserUuid}
        startDate={state.startDate}
        endDate={state.endDate}
        loading={state.loading}
        onSelectUser={actions.setSelectedUserUuid}
        onStartDateChange={actions.setStartDate}
        onEndDateChange={actions.setEndDate}
        onApply={actions.handleApply}
      />

      {!state.selectedUserUuid ? (
        <EmptyState
          icon={TrendingUp}
          title="Selecciona un usuario"
          description="Elige un usuario para ver su reporte de ganancias."
        />
      ) : state.loading && !state.report ? (
        <LoadingState label="Cargando reporte..." />
      ) : state.report ? (
        <>
          <ProfitStats
            totalProfit={state.report.total_profit}
            transactionCount={state.report.transaction_count}
            profitHint={`${state.report.username} · ${state.report.email}`}
          />
          <ProfitTransactionsList
            transactions={state.report.transactions ?? []}
            loading={state.loading}
            pagination={{
              page: state.report.page,
              totalPages: state.report.total_pages,
              total: state.report.transaction_count,
              onPageChange: actions.handlePageChange,
              disabled: state.loading,
            }}
          />
        </>
      ) : null}
    </div>
  );
}

export default function UserReportPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando..." fullHeight />}>
      <UserReportContent />
    </Suspense>
  );
}
