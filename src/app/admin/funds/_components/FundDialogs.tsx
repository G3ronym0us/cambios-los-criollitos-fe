'use client';

import { AddMemberDialog } from './AddMemberDialog';
import { CreateGroupDialog } from './CreateGroupDialog';
import { EditGroupDialog } from './EditGroupDialog';
import { EditMemberDialog } from './EditMemberDialog';
import { RegisterMovementDialog } from './RegisterMovementDialog';
import type { FundMutations } from '../_hooks/useFundMutations';
import type { FundsResources } from '../_hooks/useFundsResources';

interface FundDialogsProps {
  mutations: FundMutations;
  resources: FundsResources;
}

/** Monta los cinco diálogos de Fondos con el estado del hook de mutaciones. */
export function FundDialogs({ mutations, resources }: FundDialogsProps) {
  const { state, actions } = mutations;

  return (
    <>
      <CreateGroupDialog
        open={state.showCreateGroup}
        value={state.createGroupForm}
        currencies={resources.availableCurrencies}
        groupClients={resources.availableGroupClients}
        error={state.formError}
        submitting={state.formLoading}
        onChange={actions.setCreateGroupForm}
        onSubmit={actions.handleCreateGroup}
        onCancel={actions.closeCreateGroup}
      />

      <EditGroupDialog
        open={state.showEditGroup}
        group={state.editGroupTarget}
        value={state.editGroupForm}
        groupClients={resources.availableGroupClients}
        error={state.formError}
        submitting={state.formLoading}
        onChange={actions.setEditGroupForm}
        onSubmit={actions.handleUpdateGroup}
        onCancel={actions.closeEditGroup}
      />

      <AddMemberDialog
        open={state.showAddMember}
        value={state.addMemberForm}
        availableUsers={resources.availableUsers}
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
        error={state.formError}
        submitting={state.formLoading}
        onChange={actions.setEditMemberForm}
        onSubmit={actions.handleUpdateMember}
        onCancel={actions.closeEditMember}
      />

      <RegisterMovementDialog
        open={state.showRegisterMovement}
        value={state.movementForm}
        availableUsers={resources.availableUsers}
        error={state.formError}
        submitting={state.formLoading}
        onChange={actions.setMovementForm}
        onSubmit={actions.handleRegisterMovement}
        onCancel={actions.closeRegisterMovement}
      />
    </>
  );
}
