'use client';

import { Suspense } from 'react';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProfitStats } from '../_shared/ProfitStats';
import { ProfitTransactionsList } from '../_shared/ProfitTransactionsList';
import { MyProfitsFilters } from './_components/MyProfitsFilters';
import { useMyProfits } from './_hooks/useMyProfits';

function MyProfitsContent() {
  const { state, actions } = useMyProfits();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis ganancias"
        description="Resumen de tus ganancias por transacciones."
      />

      <MyProfitsFilters
        startDate={state.startDate}
        endDate={state.endDate}
        loading={state.loading}
        onStartDateChange={actions.setStartDate}
        onEndDateChange={actions.setEndDate}
        onApply={actions.loadReport}
      />

      {state.loading && !state.report ? (
        <LoadingState label="Cargando ganancias..." />
      ) : state.report ? (
        <>
          <ProfitStats
            totalProfit={state.report.total_profit}
            transactionCount={state.report.transaction_count}
          />
          <ProfitTransactionsList
            transactions={state.report.transactions ?? []}
            loading={state.loading}
          />
        </>
      ) : null}
    </div>
  );
}

// useSearchParams (el `?desde=hoy` que llega desde la home) exige un boundary de
// Suspense al prerenderizar.
export default function MyProfitsPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando ganancias..." fullHeight />}>
      <MyProfitsContent />
    </Suspense>
  );
}
