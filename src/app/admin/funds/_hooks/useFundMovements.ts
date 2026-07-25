'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { fundService } from '@/services/fundService';
import type { FundMovement, FundMovementFilters, FundMovementTotals } from '@/types/fund';
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
  const [totals, setTotals] = useState<FundMovementTotals | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FundMovementFilters>({});
  const [loading, setLoading] = useState(true);
  // Movimiento al que hay que saltar tras cargar la página (el par de una anulación).
  const [focusUuid, setFocusUuid] = useState<string | null>(null);
  const pendingFocus = useRef<string | null>(null);

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
      setTotals(res.data.totals ?? null);
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

  /**
   * Salta al otro lado de una anulación: del movimiento anulado a su reversa y al revés.
   * Casi nunca están en la misma página —la reversa se fecha el día de la corrección— así
   * que se le pregunta al backend en cuál cae. Si los filtros lo dejan fuera, se limpian:
   * es lo que el operador quiere cuando pide ver la otra mitad.
   */
  const goToMovement = useCallback(
    async (uuid: string) => {
      const onScreen = movements.some((m) => m.uuid === uuid);
      if (onScreen) {
        setFocusUuid(uuid);
        return;
      }
      const located = await fundService.locateMovement(uuid, {
        ...filters,
        per_page: MOVEMENTS_PER_PAGE,
      });
      if (!located.success || !located.data) {
        toast.error(located.error || 'No se pudo ubicar el movimiento');
        return;
      }
      pendingFocus.current = uuid;
      if (located.data.found && located.data.page) {
        setPage(located.data.page);
        return;
      }
      // Fuera del filtro actual: se limpia y se vuelve a ubicar sin él.
      const retry = await fundService.locateMovement(uuid, { per_page: MOVEMENTS_PER_PAGE });
      setFilters({});
      setPage(retry.data?.page ?? 1);
      toast.info('Se quitaron los filtros para mostrar el movimiento');
    },
    [movements, filters],
  );

  // Una vez cargada la página destino, se marca la fila para resaltarla.
  useEffect(() => {
    if (!pendingFocus.current || loading) return;
    if (movements.some((m) => m.uuid === pendingFocus.current)) {
      setFocusUuid(pendingFocus.current);
      pendingFocus.current = null;
    }
  }, [movements, loading]);

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
      totals,
      focusUuid,
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
      goToMovement,
      clearFocus: () => setFocusUuid(null),
      setFilters,
      resetFilters,
      setPage,
    },
  };
}
