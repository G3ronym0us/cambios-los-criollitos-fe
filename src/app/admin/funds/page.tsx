'use client';

import { Wallet } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { AddMemberDialog } from './_components/AddMemberDialog';
import { BalanceCards } from './_components/BalanceCards';
import { CreateGroupDialog } from './_components/CreateGroupDialog';
import { EditMemberDialog } from './_components/EditMemberDialog';
import { GroupSelector } from './_components/GroupSelector';
import { MemberPositionsList } from './_components/MemberPositionsList';
import { MembersList } from './_components/MembersList';
import { MovementsFilters } from './_components/MovementsFilters';
import { MovementsList } from './_components/MovementsList';
import { RegisterMovementDialog } from './_components/RegisterMovementDialog';
import { useFunds } from './_hooks/useFunds';

export default function FundsAdminPage() {
  const { state, actions } = useFunds();

  if (state.loadingGroups) {
    return <LoadingState label="Cargando fondos..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fondos"
        description="Gestión de posiciones y movimientos de fondos físicos."
      />

      {state.groups.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No hay grupos de fondos"
          description={
            state.isModeratorOrAbove
              ? 'Crea tu primer grupo para empezar a registrar movimientos.'
              : 'Espera a que un moderador cree un grupo para verlo aquí.'
          }
        />
      ) : (
        <>
          <GroupSelector
            groups={state.groups}
            selectedGroupUuid={state.selectedGroupUuid}
            isModeratorOrAbove={state.isModeratorOrAbove}
            onSelect={actions.setSelectedGroupUuid}
            onNewGroup={actions.openCreateGroup}
            onAddMember={actions.openAddMember}
            onRegisterMovement={actions.openRegisterMovement}
          />

          <BalanceCards balance={state.groupBalance} loading={state.loadingBalance} />

          {state.groupBalance ? (
            <MemberPositionsList members={state.groupBalance.by_member} />
          ) : null}

          {state.isModeratorOrAbove ? (
            <>
              <MembersList
                members={state.selectedGroupMembers}
                canEdit={state.isModeratorOrAbove}
                onEdit={actions.openEditMember}
              />

              <MovementsFilters
                filters={state.movementFilters}
                hasActiveFilters={state.hasActiveFilters}
                onChange={actions.setMovementFilters}
                onReset={actions.resetFilters}
              />

              <MovementsList
                movements={state.movements}
                loading={state.loadingMovements}
                isRoot={state.isRoot}
                page={state.movementsPage}
                totalPages={state.totalMovementsPages}
                total={state.movementsTotal}
                getUserDisplayName={actions.getUserDisplayName}
                onDelete={actions.handleDeleteMovement}
                onPageChange={actions.setMovementsPage}
              />
            </>
          ) : null}
        </>
      )}

      <CreateGroupDialog
        open={state.showCreateGroup}
        value={state.createGroupForm}
        currencies={state.availableCurrencies}
        error={state.formError}
        submitting={state.formLoading}
        onChange={actions.setCreateGroupForm}
        onSubmit={actions.handleCreateGroup}
        onCancel={actions.closeCreateGroup}
      />

      <AddMemberDialog
        open={state.showAddMember}
        value={state.addMemberForm}
        availableUsers={state.availableUsers}
        availableClients={state.availableClients}
        error={state.formError}
        submitting={state.formLoading}
        onChange={actions.setAddMemberForm}
        onSubmit={actions.handleAddMember}
        onCancel={actions.closeAddMember}
      />

      <EditMemberDialog
        open={state.showEditMember}
        member={state.editMemberTarget}
        value={state.editMemberForm}
        availableClients={state.availableClients}
        error={state.formError}
        submitting={state.formLoading}
        onChange={actions.setEditMemberForm}
        onSubmit={actions.handleUpdateMember}
        onCancel={actions.closeEditMember}
      />

      <RegisterMovementDialog
        open={state.showRegisterMovement}
        value={state.movementForm}
        availableUsers={state.availableUsers}
        error={state.formError}
        submitting={state.formLoading}
        onChange={actions.setMovementForm}
        onSubmit={actions.handleRegisterMovement}
        onCancel={actions.closeRegisterMovement}
      />
    </div>
  );
}
