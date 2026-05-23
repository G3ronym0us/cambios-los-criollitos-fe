'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { userService } from '@/services/userService';
import {
  CommissionUserResponse,
  UserCreate,
  UserData,
  UserUpdate,
} from '@/types/user';
import { useConfirm } from '@/hooks/useConfirm';

export type UsersRoleFilter = 'ALL' | 'USER' | 'MODERATOR' | 'ROOT';
export type UsersCommissionFilter = 'ALL' | 'YES' | 'NO';

export interface UsersFilters {
  search: string;
  role: UsersRoleFilter;
  commission: UsersCommissionFilter;
}

const emptyFilters: UsersFilters = {
  search: '',
  role: 'ALL',
  commission: 'ALL',
};

export function useUsers() {
  const confirm = useConfirm();

  const [users, setUsers] = useState<CommissionUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UsersFilters>(emptyFilters);

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const result = await userService.getAllUsers({ active_only: true });
    if (result.success && result.data) {
      const list = Array.isArray(result.data) ? result.data : result.data.users;
      setUsers(list || []);
    } else {
      toast.error(result.error || 'Error al cargar los usuarios');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetFilters = useCallback(() => setFilters(emptyFilters), []);
  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.role !== 'ALL' ||
    filters.commission !== 'ALL';

  const filteredUsers = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return users.filter((u) => {
      if (filters.role !== 'ALL') {
        const role = (u.role || '').toUpperCase();
        if (role !== filters.role) return false;
      }
      if (filters.commission !== 'ALL') {
        const wantsCommission = filters.commission === 'YES';
        if (u.can_receive_commission !== wantsCommission) return false;
      }
      if (!query) return true;
      return (
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.full_name || '').toLowerCase().includes(query)
      );
    });
  }, [users, filters]);

  const stats = useMemo(() => {
    const total = users.length;
    const commissioners = users.filter((u) => u.can_receive_commission).length;
    return { total, commissioners };
  }, [users]);

  const openCreate = useCallback(() => setShowCreate(true), []);
  const closeCreate = useCallback(() => setShowCreate(false), []);

  const openEdit = useCallback(async (userUuid: string) => {
    const result = await userService.getUserById(userUuid);
    if (result.success && result.data) {
      setEditingUser(result.data);
    } else {
      toast.error(result.error || 'Error al cargar datos del usuario');
    }
  }, []);

  const closeEdit = useCallback(() => setEditingUser(null), []);

  const handleCreate = useCallback(
    async (data: UserCreate) => {
      setSubmitting(true);
      const result = await userService.createUser(data);
      setSubmitting(false);
      if (result.success) {
        toast.success('Usuario creado correctamente');
        closeCreate();
        loadUsers();
      } else {
        toast.error(result.error || 'Error al crear el usuario');
      }
    },
    [closeCreate, loadUsers]
  );

  const handleUpdate = useCallback(
    async (data: UserUpdate) => {
      if (!editingUser) return;
      setSubmitting(true);
      const result = await userService.updateUser(editingUser.uuid, data);
      setSubmitting(false);
      if (result.success) {
        toast.success('Usuario actualizado correctamente');
        closeEdit();
        loadUsers();
      } else {
        toast.error(result.error || 'Error al actualizar el usuario');
      }
    },
    [editingUser, closeEdit, loadUsers]
  );

  const handleToggleCommission = useCallback(
    async (user: CommissionUserResponse) => {
      const next = !user.can_receive_commission;
      const result = await userService.updateCommissionSettings(user.uuid, {
        can_receive_commission: next,
      });
      if (result.success) {
        toast.success(
          next
            ? `${user.full_name || user.username} ahora puede recibir comisiones`
            : `${user.full_name || user.username} ya no recibe comisiones`
        );
        loadUsers();
      } else {
        toast.error(result.error || 'Error al actualizar configuración');
      }
    },
    [loadUsers]
  );

  const handleDelete = useCallback(
    async (user: CommissionUserResponse) => {
      const displayName = user.full_name || user.username;
      const ok = await confirm({
        title: '¿Desactivar usuario?',
        description: `Se desactivará a "${displayName}". La acción se puede revertir más tarde.`,
        confirmText: 'Desactivar',
        variant: 'destructive',
      });
      if (!ok) return;

      const result = await userService.deleteUser(user.uuid);
      if (result.success) {
        toast.success('Usuario desactivado');
        loadUsers();
      } else {
        toast.error(result.error || 'Error al desactivar el usuario');
      }
    },
    [confirm, loadUsers]
  );

  return {
    state: {
      users: filteredUsers,
      loading,
      filters,
      hasActiveFilters,
      stats,
      showCreate,
      editingUser,
      submitting,
    },
    actions: {
      setFilters,
      resetFilters,
      openCreate,
      closeCreate,
      openEdit,
      closeEdit,
      handleCreate,
      handleUpdate,
      handleToggleCommission,
      handleDelete,
    },
  };
}
