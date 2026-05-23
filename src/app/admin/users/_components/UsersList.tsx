'use client';

import { Plus, RotateCcw, SlidersHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import type { CommissionUserResponse } from '@/types/user';
import { UserItem } from './UserItem';

interface UsersListProps {
  users: CommissionUserResponse[];
  loading: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onCreate: () => void;
  onEdit: (userUuid: string) => void;
  onDelete: (user: CommissionUserResponse) => void;
  onToggleCommission: (user: CommissionUserResponse) => void;
}

export function UsersList({
  users,
  loading,
  hasActiveFilters,
  onResetFilters,
  onCreate,
  onEdit,
  onDelete,
  onToggleCommission,
}: UsersListProps) {
  if (loading) {
    return <LoadingState label="Cargando usuarios..." />;
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilters ? SlidersHorizontal : Users}
        title={hasActiveFilters ? 'No hay usuarios con estos filtros' : 'No hay usuarios'}
        description={
          hasActiveFilters
            ? 'Prueba ajustando los filtros o crea un nuevo usuario.'
            : 'Comienza creando tu primer usuario para gestionar comisiones y permisos.'
        }
        actions={
          <>
            {hasActiveFilters ? (
              <Button variant="outline" size="lg" onClick={onResetFilters}>
                <RotateCcw className="h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : null}
            <Button size="lg" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              {hasActiveFilters ? 'Crear nuevo usuario' : 'Crear primer usuario'}
            </Button>
          </>
        }
      />
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
      {users.map((user) => (
        <UserItem
          key={user.uuid}
          user={user}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleCommission={onToggleCommission}
        />
      ))}
    </div>
  );
}
