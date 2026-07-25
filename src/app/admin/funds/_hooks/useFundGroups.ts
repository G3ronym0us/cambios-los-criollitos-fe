'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fundService } from '@/services/fundService';
import type { GroupBalance } from '@/types/fund';
import { useFundsResources } from './useFundsResources';
import { useFundMutations } from './useFundMutations';

type StatusFilter = 'all' | 'active' | 'inactive';

/**
 * Pantalla 1 (listado de grupos): grupos + balance de cada uno para la columna «Posición»
 * y las estadísticas de cabecera, más búsqueda/filtro por estado y los diálogos de
 * crear grupo / agregar miembro / editar grupo por fila.
 */
export function useFundGroups() {
  const resources = useFundsResources();
  const { groups, loadingGroups } = resources;

  const [balances, setBalances] = useState<Record<string, GroupBalance>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadBalances = useCallback(async () => {
    if (groups.length === 0) {
      setBalances({});
      return;
    }
    setLoadingBalances(true);
    const results = await Promise.all(
      groups.map(async (g) => {
        const res = await fundService.getGroupBalance(g.uuid);
        return res.success && res.data ? ([g.uuid, res.data] as const) : null;
      }),
    );
    setBalances(Object.fromEntries(results.filter((r): r is [string, GroupBalance] => r !== null)));
    setLoadingBalances(false);
  }, [groups]);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);

  const mutations = useFundMutations({ resources, onChanged: loadBalances });

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (statusFilter === 'active' && !g.is_active) return false;
      if (statusFilter === 'inactive' && g.is_active) return false;
      if (term && !g.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [groups, search, statusFilter]);

  const summary = useMemo(() => {
    const activeCount = groups.filter((g) => g.is_active).length;
    const totalMembers = groups.reduce((acc, g) => acc + (g.members?.length ?? 0), 0);
    const totalPosition = Object.values(balances).reduce(
      (acc, b) => acc + b.total_position_usdt,
      0,
    );
    return { activeCount, totalMembers, totalPosition };
  }, [groups, balances]);

  return {
    resources,
    mutations,
    state: {
      isModeratorOrAbove: resources.isModeratorOrAbove,
      groups,
      filteredGroups,
      balances,
      summary,
      loadingGroups,
      loadingBalances,
      search,
      statusFilter,
      hasGroups: groups.length > 0,
    },
    actions: {
      setSearch,
      setStatusFilter,
    },
  };
}
