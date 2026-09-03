'use client';

import { Suspense } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { AlertsStats } from './_components/AlertsStats';
import { AlertsFilters } from './_components/AlertsFilters';
import { AlertsList } from './_components/AlertsList';
import { PushToggle } from './_components/PushToggle';
import { useAlerts } from './_hooks/useAlerts';

function AlertsAdminContent() {
  const { state, actions } = useAlerts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas de divergencia"
        description="Divergencias detectadas entre la tasa manual y la tasa automática."
        actions={<PushToggle />}
      />

      <AlertsStats stats={state.stats} />

      <AlertsFilters
        unackedOnly={state.unackedOnly}
        loading={state.loading}
        onToggleUnacked={actions.setUnackedOnly}
        onRefresh={actions.load}
      />

      <AlertsList
        alerts={state.alerts}
        loading={state.loading}
        unackedOnly={state.unackedOnly}
        onAck={actions.handleAck}
      />
    </div>
  );
}

// useSearchParams (el `?unacked=1` que llega desde la home) exige un boundary de
// Suspense al prerenderizar.
export default function AlertsAdminPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando alertas..." fullHeight />}>
      <AlertsAdminContent />
    </Suspense>
  );
}
