'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Wallet } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';
import { FundDialogs } from '../../_components/FundDialogs';
import { FundsBreadcrumb } from '../../_components/FundsBreadcrumb';
import { MovementsFilters } from '../../_components/MovementsFilters';
import { MovementsList } from '../../_components/MovementsList';
import { MovementsTotals } from '../../_components/MovementsTotals';
import { useFundMovements } from '../../_hooks/useFundMovements';

export default function FundMovementsPage() {
  const params = useParams<{ groupUuid: string }>();
  const groupUuid = params.groupUuid;
  const { resources, mutations, state, actions } = useFundMovements(groupUuid);

  if (state.loadingGroups) {
    return <LoadingState label="Cargando movimientos..." fullHeight />;
  }

  if (state.notFound || !state.group) {
    return (
      <div className="space-y-6">
        <FundsBreadcrumb items={[{ label: 'Fondos', href: '/admin/funds' }, { label: 'No encontrado' }]} />
        <EmptyState
          icon={Wallet}
          title="Grupo no encontrado"
          description="El grupo de fondos no existe o fue eliminado."
          actions={
            <Link href="/admin/funds" className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
              <ArrowLeft className="h-4 w-4" />
              Volver a Fondos
            </Link>
          }
        />
      </div>
    );
  }

  const { group } = state;

  return (
    <div className="space-y-6">
      <FundsBreadcrumb
        items={[
          { label: 'Fondos', href: '/admin/funds' },
          { label: group.name, href: `/admin/funds/${groupUuid}` },
          { label: 'Movimientos' },
        ]}
      />

      <PageHeader
        title="Historial de movimientos"
        description={`${group.name} · ${state.total} ${
          state.total === 1 ? 'movimiento' : 'movimientos'
        }`}
        actions={
          <Button size="lg" onClick={() => mutations.actions.openRegisterMovement()}>
            <Plus className="h-4 w-4" />
            Registrar movimiento
          </Button>
        }
      />

      <MovementsFilters
        filters={state.filters}
        hasActiveFilters={state.hasActiveFilters}
        onChange={actions.setFilters}
        onReset={actions.resetFilters}
      />

      <MovementsTotals
        totals={state.totals}
        loading={state.loading}
        hasActiveFilters={state.hasActiveFilters}
      />

      <MovementsList
        movements={state.movements}
        loading={state.loading}
        isRoot={state.isRoot}
        page={state.page}
        totalPages={state.totalPages}
        total={state.total}
        getUserDisplayName={state.getUserDisplayName}
        onDelete={mutations.actions.handleDeleteMovement}
        onPageChange={actions.setPage}
      />

      <FundDialogs mutations={mutations} resources={resources} />
    </div>
  );
}
