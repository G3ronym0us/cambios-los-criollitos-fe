'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fundService } from '@/services/fundService';
import type { FundMovement, FundMovementFilters } from '@/types/fund';
import { useFundsResources } from './useFundsResources';
import { useFundMutations } from './useFundMutations';

const MOVEMENTS_PER_PAGE = 50;

/**
 * Pantalla 3 (historial de movimientos): lista paginada con filtros por tipo y rango de
 * fechas, más el registro y borrado de movimientos del grupo de la ruta.
 */
export function useFundMovements(groupUuid: string) {
  const resources = useFundsResources();
  const { groups, loadingGroups } = resources;

  const [movements, setMovements] = useState<FundMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FundMovementFilters>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!groupUuid) return;
    setLoading(true);
    const res = await fundService.getGroupMovements(groupUuid, {
      ...filters,
      page,
      per_page: MOVEMENTS_PER_PAGE,
    });
    if (res.success && res.data) {
      setMovements(res.data.movements);
      setTotal(res.data.total);
    } else if (!res.success) {
      toast.error(res.error || 'Error al cargar movimientos');
    }
    setLoading(false);
  }, [groupUuid, filters, page]);

  // Al cambiar los filtros se vuelve a la primera página.
  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutations = useFundMutations({
    resources,
    defaultGroupUuid: groupUuid,
    onChanged: load,
  });

  const group = groups.find((g) => g.uuid === groupUuid) ?? null;
  const notFound = !loadingGroups && group === null;
  const totalPages = Math.max(1, Math.ceil(total / MOVEMENTS_PER_PAGE));
  const hasActiveFilters =
    !!filters.movement_type || !!filters.date_from || !!filters.date_to;

  const resetFilters = useCallback(() => setFilters({}), []);

  return {
    resources,
    mutations,
    state: {
      isRoot: resources.isRoot,
      group,
      groupUuid,
      movements,
      total,
      page,
      totalPages,
      filters,
      hasActiveFilters,
      loading,
      loadingGroups,
      notFound,
      getUserDisplayName: resources.getUserDisplayName,
    },
    actions: {
      setFilters,
      resetFilters,
      setPage,
    },
  };
}
