'use client';

import { useCallback, useEffect, useState } from 'react';
import { fundService } from '@/services/fundService';
import type { FundGroup } from '@/types/fund';

/** Carga los grupos de fondo (con sus miembros) para los selects de escenario. */
export function useFundGroups() {
  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fundService.getGroups();
    if (res.success && res.data) setGroups(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { groups, loading, reload: load };
}
