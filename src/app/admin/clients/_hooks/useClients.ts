'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { clientService } from '@/services/clientService';
import { ClientData, ClientUpdate } from '@/types/client';

export type BoolFilter = 'ALL' | 'YES' | 'NO';

export interface ClientsFilters {
  search: string;
  blocked: BoolFilter;
  tracked: BoolFilter;
}

const emptyFilters: ClientsFilters = { search: '', blocked: 'ALL', tracked: 'ALL' };

export function useClients() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ClientsFilters>(emptyFilters);
  const [editing, setEditing] = useState<ClientData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    const result = await clientService.getClients({ limit: 500 });
    if (result.success && result.data) {
      setClients(result.data.items || []);
    } else {
      toast.error(result.error || 'Error al cargar los clientes');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const resetFilters = useCallback(() => setFilters(emptyFilters), []);
  const hasActiveFilters =
    filters.search.trim() !== '' || filters.blocked !== 'ALL' || filters.tracked !== 'ALL';

  const filteredClients = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return clients.filter((c) => {
      if (filters.blocked !== 'ALL' && c.is_blocked !== (filters.blocked === 'YES')) return false;
      if (filters.tracked !== 'ALL' && c.is_tracked !== (filters.tracked === 'YES')) return false;
      if (!q) return true;
      return (
        (c.display_name || '').toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [clients, filters]);

  const stats = useMemo(
    () => ({
      total: clients.length,
      blocked: clients.filter((c) => c.is_blocked).length,
      tracked: clients.filter((c) => c.is_tracked).length,
    }),
    [clients]
  );

  const openEdit = useCallback((client: ClientData) => setEditing(client), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  const handleUpdate = useCallback(
    async (data: ClientUpdate) => {
      if (!editing) return;
      setSubmitting(true);
      const result = await clientService.updateClient(editing.uuid, data);
      setSubmitting(false);
      if (result.success) {
        toast.success('Cliente actualizado correctamente');
        closeEdit();
        loadClients();
      } else {
        toast.error(result.error || 'Error al actualizar el cliente');
      }
    },
    [editing, closeEdit, loadClients]
  );

  const handleToggleBlocked = useCallback(
    async (client: ClientData) => {
      const result = await clientService.updateClient(client.uuid, {
        is_blocked: !client.is_blocked,
      });
      if (result.success) {
        toast.success(client.is_blocked ? 'Cliente desbloqueado' : 'Cliente bloqueado');
        loadClients();
      } else {
        toast.error(result.error || 'Error al actualizar el cliente');
      }
    },
    [loadClients]
  );

  return {
    state: {
      clients: filteredClients,
      loading,
      filters,
      editing,
      submitting,
      stats,
      hasActiveFilters,
    },
    actions: { setFilters, resetFilters, openEdit, closeEdit, handleUpdate, handleToggleBlocked },
  };
}
