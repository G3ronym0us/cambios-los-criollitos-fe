'use client';

import { useCallback, useEffect, useState } from 'react';
import { analysisService } from '@/services/analysisService';
import type { AnalysisData, AnalysisStats } from '@/types/analysis';

const DEBOUNCE_MS = 300;

/**
 * Estado del listado de análisis.
 *
 * El filtrado es server-side salvo la búsqueda, que se debouncea acá para no disparar una
 * consulta por tecla — el backend recorre la ventana entera en memoria para poder filtrar
 * por veredicto, que es derivado y no existe como columna.
 */
export function useAnalyses() {
  const [items, setItems] = useState<AnalysisData[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [days, setDays] = useState(7);
  const [onlyPending, setOnlyPending] = useState(true);
  const [untrackedOnly, setUntrackedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [list, st] = await Promise.all([
      analysisService.getAnalyses({
        days,
        onlyPending,
        untracked: untrackedOnly ? true : undefined,
        search: debouncedSearch || undefined,
      }),
      analysisService.getStats(days),
    ]);
    if (list.success && list.data) {
      setItems(list.data.items);
      setTotal(list.data.total);
    } else {
      setError(list.error ?? 'No se pudo cargar el listado');
      setItems([]);
      setTotal(0);
    }
    if (st.success && st.data) setStats(st.data);
    setLoading(false);
  }, [days, onlyPending, untrackedOnly, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActiveFilters = onlyPending || untrackedOnly || search !== '' || days !== 7;

  const resetFilters = useCallback(() => {
    setOnlyPending(true);
    setUntrackedOnly(false);
    setSearch('');
    setDays(7);
  }, []);

  return {
    state: { items, stats, total, loading, error, days, onlyPending, untrackedOnly, search, hasActiveFilters },
    actions: { setDays, setOnlyPending, setUntrackedOnly, setSearch, resetFilters, reload: load },
  };
}
