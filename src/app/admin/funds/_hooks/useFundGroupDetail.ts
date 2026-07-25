'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fundService } from '@/services/fundService';
import type { FundMovement, GroupBalance } from '@/types/fund';
import { useFundsResources } from './useFundsResources';
import { useFundMutations } from './useFundMutations';

const PREVIEW_COUNT = 3;

/**
 * Pantalla 2 (detalle de un grupo): balance, últimos movimientos (resumen) y los diálogos
 * de agregar miembro / registrar movimiento / editar grupo / editar miembro, todos
 * apuntando al grupo de la ruta.
 */
export function useFundGroupDetail(groupUuid: string) {
  const resources = useFundsResources();
  const { groups, loadingGroups } = resources;

  const [balance, setBalance] = useState<GroupBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [recentMovements, setRecentMovements] = useState<FundMovement[]>([]);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [loadingMovements, setLoadingMovements] = useState(true);

  const loadData = useCallback(async () => {
    if (!groupUuid) return;
    setLoadingBalance(true);
    setLoadingMovements(true);

    const [balanceRes, movementsRes] = await Promise.all([
      fundService.getGroupBalance(groupUuid),
      fundService.getGroupMovements(groupUuid, { page: 1, per_page: PREVIEW_COUNT }),
    ]);

    if (balanceRes.success && balanceRes.data) setBalance(balanceRes.data);
    setLoadingBalance(false);

    if (movementsRes.success && movementsRes.data) {
      setRecentMovements(movementsRes.data.movements);
      setMovementsTotal(movementsRes.data.total);
    } else if (!movementsRes.success) {
      toast.error(movementsRes.error || 'Error al cargar movimientos');
    }
    setLoadingMovements(false);
  }, [groupUuid]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const mutations = useFundMutations({
    resources,
    defaultGroupUuid: groupUuid,
    onChanged: loadData,
  });

  const group = groups.find((g) => g.uuid === groupUuid) ?? null;
  const notFound = !loadingGroups && group === null;

  return {
    resources,
    mutations,
    state: {
      isModeratorOrAbove: resources.isModeratorOrAbove,
      group,
      groupUuid,
      balance,
      recentMovements,
      movementsTotal,
      members: group?.members ?? [],
      loadingGroups,
      loadingBalance,
      loadingMovements,
      notFound,
      getUserDisplayName: resources.getUserDisplayName,
    },
    actions: {
      reload: loadData,
    },
  };
}
