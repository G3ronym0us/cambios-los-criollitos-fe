'use client';

import { Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { FundDialogs } from './_components/FundDialogs';
import { GroupSummary } from './_components/GroupSummary';
import { GroupsList } from './_components/GroupsList';
import { useFundGroups } from './_hooks/useFundGroups';

export default function FundsListPage() {
  const { resources, mutations, state, actions } = useFundGroups();

  if (state.loadingGroups) {
    return <LoadingState label="Cargando fondos..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fondos"
        description="Grupos de fondos físicos y sus posiciones."
        actions={
          state.isModeratorOrAbove ? (
            <Button size="lg" onClick={mutations.actions.openCreateGroup}>
              <Plus className="h-4 w-4" />
              Nuevo grupo
            </Button>
          ) : undefined
        }
      />

      {!state.hasGroups ? (
        <EmptyState
          icon={Wallet}
          title="No hay grupos de fondos"
          description={
            state.isModeratorOrAbove
              ? 'Crea tu primer grupo para empezar a registrar movimientos.'
              : 'Espera a que un moderador cree un grupo para verlo aquí.'
          }
          actions={
            state.isModeratorOrAbove ? (
              <Button onClick={mutations.actions.openCreateGroup}>
                <Plus className="h-4 w-4" />
                Nuevo grupo
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <GroupSummary
            activeCount={state.summary.activeCount}
            totalPosition={state.summary.totalPosition}
            totalMembers={state.summary.totalMembers}
            loadingPosition={state.loadingBalances}
          />

          <GroupsList
            groups={state.filteredGroups}
            balances={state.balances}
            loadingBalances={state.loadingBalances}
            isModeratorOrAbove={state.isModeratorOrAbove}
            search={state.search}
            statusFilter={state.statusFilter}
            onSearch={actions.setSearch}
            onStatusFilter={actions.setStatusFilter}
            onAddMember={(g) => mutations.actions.openAddMember(g.uuid)}
            onEditGroup={mutations.actions.openEditGroup}
          />
        </>
      )}

      <FundDialogs mutations={mutations} resources={resources} />
    </div>
  );
}
