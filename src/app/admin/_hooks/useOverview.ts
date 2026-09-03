'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { overviewService } from '@/services/overviewService';
import type { AdminOverview } from '@/types/overview';

// Refresca sola: es un tablero "en vivo", no una foto que se queda vieja mientras el
// operador la mira.
const REFRESH_MS = 30_000;

export function useOverview() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  // Distingue "todavía no hay nada" (primera carga) de "la petición entera se cayó" — un
  // fallo total sí tumba la home; un bloque en `errors` no.
  const [fatalError, setFatalError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    const id = ++requestId.current;
    if (!opts.silent) setLoading(true);
    const result = await overviewService.getOverview();
    if (id !== requestId.current) return;
    if (result.success && result.data) {
      setOverview(result.data);
      setFatalError(null);
    } else {
      setFatalError(result.error || 'No se pudo cargar el tablero');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return {
    state: { overview, loading, fatalError },
    actions: { refresh },
  };
}
