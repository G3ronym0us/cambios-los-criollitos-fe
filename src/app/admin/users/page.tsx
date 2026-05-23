'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { UsersStats } from './_components/UsersStats';
import { UsersFilters } from './_components/UsersFilters';
import { UsersList } from './_components/UsersList';
import { UserCreateDialog } from './_components/UserCreateDialog';
import { UserEditDialog } from './_components/UserEditDialog';
import { useUsers } from './_hooks/useUsers';

export default function UsersAdminPage() {
  const { state, actions } = useUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Administra usuarios, permisos y configuración de comisiones."
        actions={
          <Button size="lg" onClick={actions.openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        }
      />

      <UsersStats stats={state.stats} />

      <UsersFilters
        filters={state.filters}
        hasActiveFilters={state.hasActiveFilters}
        onChange={actions.setFilters}
        onReset={actions.resetFilters}
      />

      <UsersList
        users={state.users}
        loading={state.loading}
        hasActiveFilters={state.hasActiveFilters}
        onResetFilters={actions.resetFilters}
        onCreate={actions.openCreate}
        onEdit={actions.openEdit}
        onDelete={actions.handleDelete}
        onToggleCommission={actions.handleToggleCommission}
      />

      <UserCreateDialog
        open={state.showCreate}
        submitting={state.submitting}
        onSubmit={actions.handleCreate}
        onCancel={actions.closeCreate}
      />

      <UserEditDialog
        user={state.editingUser}
        submitting={state.submitting}
        onSubmit={actions.handleUpdate}
        onCancel={actions.closeEdit}
      />
    </div>
  );
}
