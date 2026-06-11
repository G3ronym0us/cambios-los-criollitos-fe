'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clientService } from '@/services/clientService';
import { ClientData } from '@/types/client';

export type BoolFilter = 'ALL' | 'YES' | 'NO';

export interface ClientsFilters {
  search: string;
  blocked: BoolFilter;
  tracked: BoolFilter;
}

const emptyFilters: ClientsFilters = { search: '', blocked: 'ALL', tracked: 'ALL' };

export function useClients() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientsFilters>(emptyFilters);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await clientService.getClients({ limit: 500 });
    if (result.success && result.data) {
      const items = result.data.items || [];
      setClients(items);
      setTotal(result.data.total ?? items.length);
    } else {
      setError(result.error || 'Error al cargar los clientes');
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
      total,
      blocked: clients.filter((c) => c.is_blocked).length,
      tracked: clients.filter((c) => c.is_tracked).length,
    }),
    [clients, total]
  );

  // Clientes que exceden el límite de carga y no están en memoria (ni en la búsqueda).
  const hiddenCount = Math.max(0, total - clients.length);

  return {
    state: {
      clients: filteredClients,
      loading,
      error,
      filters,
      stats,
      hasActiveFilters,
      hiddenCount,
    },
    actions: { setFilters, resetFilters, reload: loadClients },
  };
}
