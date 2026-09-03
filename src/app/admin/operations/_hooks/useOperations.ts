'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { operationService } from '@/services/operationService';
import { OperationData, OperationScenario, OperationStats, OperationStatus } from '@/types/operation';

export type StatusFilter = 'ALL' | OperationStatus;
export type DeliveryFilter = 'ALL' | 'PENDING' | 'RECEIVED';
export type ScenarioFilter = 'ALL' | OperationScenario;
/** Los tres segmentos del listado. */
export type SegmentFilter = 'ACTION' | 'OPEN' | 'ALL';
/** Cada tarjeta de la cabecera aplica su bandeja; `null` es «no hay tarjeta activa». */
export type NeedsFilter = 'settle' | 'deliver' | 'client' | 'expiring' | null;

export interface OperationsFilters {
  search: string;
  status: StatusFilter;
  delivery: DeliveryFilter;
  scenario: ScenarioFilter;
  segment: SegmentFilter;
  /** La tarjeta pulsada en la cabecera. Manda sobre el segmento. */
  needs: NeedsFilter;
}

const emptyFilters: OperationsFilters = {
  search: '',
  status: 'ALL',
  delivery: 'ALL',
  scenario: 'ALL',
  segment: 'ALL',
  needs: null,
};

const emptyStats: OperationStats = {
  pending: 0,
  completed: 0,
  quoted: 0,
  cancelled: 0,
  completed_today: 0,
  to_settle: 0,
  to_settle_amount: 0,
  to_deliver: 0,
  to_deliver_oldest_at: null,
  without_client: 0,
  expiring: 0,
  expiring_next_at: null,
};

export const PAGE_SIZES = [25, 50, 100] as const;

/**
 * El segmento y las tarjetas se traducen al `needs` del servidor, que filtra por lo que
 * hace falta HACER y no por estado — «le faltan comprobantes» y «no tiene cliente» no son
 * un status. Una tarjeta pulsada manda sobre el segmento: es más específica.
 */
function needsParam(filters: OperationsFilters): string | undefined {
  if (filters.needs) return filters.needs;
  if (filters.segment === 'ACTION') return 'action';
  return undefined;
}

const NEEDS_VALUES: NonNullable<NeedsFilter>[] = ['settle', 'deliver', 'client', 'expiring'];

export function useOperations() {
  const searchParams = useSearchParams();
  const [operations, setOperations] = useState<OperationData[]>([]);
  const [stats, setStats] = useState<OperationStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  // La home enlaza aquí con `?needs=settle|deliver|expiring`: la tarjeta pulsada allá
  // debe llegar ya aplicada, no obligar a un segundo clic sobre la de esta pantalla.
  const [filters, setFilters] = useState<OperationsFilters>(() => {
    const needsParam = searchParams.get('needs') as NeedsFilter | null;
    const needs = needsParam && NEEDS_VALUES.includes(needsParam) ? needsParam : null;
    return needs ? { ...emptyFilters, needs } : emptyFilters;
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [total, setTotal] = useState(0);

  // Cada carga lleva su número: si el operador teclea rápido, la respuesta que llega
  // tarde no debe pisar a la que se pidió después.
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);

    const [opsRes, statsRes] = await Promise.all([
      operationService.getOperations({
        page,
        limit: pageSize,
        search: filters.search.trim() || undefined,
        needs: needsParam(filters),
        // «En curso» es lo que todavía no cerró; el resto lo decide el select de estado.
        status:
          filters.status !== 'ALL'
            ? filters.status
            : filters.segment === 'OPEN'
              ? 'PENDING'
              : undefined,
        delivery_status: filters.delivery !== 'ALL' ? filters.delivery : undefined,
        scenario: filters.scenario !== 'ALL' ? filters.scenario : undefined,
      }),
      operationService.getStats(),
    ]);

    if (id !== requestId.current) return;

    if (opsRes.success && opsRes.data) {
      setOperations(opsRes.data.operations || []);
      setTotal(opsRes.data.total ?? 0);
    } else {
      toast.error(opsRes.error || 'Error al cargar las operaciones');
    }
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    setLoading(false);
  }, [page, pageSize, filters]);

  useEffect(() => {
    load();
  }, [load]);

  /** Cambiar un filtro siempre devuelve a la primera página: la 3 de otra búsqueda no existe. */
  const updateFilters = useCallback((next: OperationsFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(emptyFilters);
    setPage(1);
  }, []);

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.status !== 'ALL' ||
    filters.delivery !== 'ALL' ||
    filters.scenario !== 'ALL' ||
    filters.segment !== 'ALL' ||
    filters.needs !== null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return {
    state: {
      operations,
      stats,
      loading,
      filters,
      hasActiveFilters,
      page,
      pageSize,
      total,
      totalPages,
      from,
      to,
    },
    actions: {
      setFilters: updateFilters,
      resetFilters,
      setPage,
      setPageSize: changePageSize,
      reload: load,
    },
  };
}
