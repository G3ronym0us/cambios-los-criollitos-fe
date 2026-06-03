'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { operationService } from '@/services/operationService';
import { OperationData, OperationStats, OperationStatus } from '@/types/operation';

export type StatusFilter = 'ALL' | OperationStatus;
export type DeliveryFilter = 'ALL' | 'PENDING' | 'RECEIVED';

export interface OperationsFilters {
  search: string;
  status: StatusFilter;
  delivery: DeliveryFilter;
}

const emptyFilters: OperationsFilters = { search: '', status: 'ALL', delivery: 'ALL' };

const emptyStats: OperationStats = {
  pending: 0,
  completed: 0,
  quoted: 0,
  cancelled: 0,
  completed_today: 0,
};

export function useOperations() {
  const [operations, setOperations] = useState<OperationData[]>([]);
  const [stats, setStats] = useState<OperationStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OperationsFilters>(emptyFilters);

  const load = useCallback(async () => {
    setLoading(true);
    const [opsRes, statsRes] = await Promise.all([
      operationService.getOperations({ limit: 500 }),
      operationService.getStats(),
    ]);
    if (opsRes.success && opsRes.data) {
      setOperations(opsRes.data.operations || []);
    } else {
      toast.error(opsRes.error || 'Error al cargar las operaciones');
    }
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetFilters = useCallback(() => setFilters(emptyFilters), []);
  const hasActiveFilters =
    filters.search.trim() !== '' || filters.status !== 'ALL' || filters.delivery !== 'ALL';

  const filteredOperations = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return operations.filter((op) => {
      if (filters.status !== 'ALL' && op.status !== filters.status) return false;
      if (filters.delivery !== 'ALL' && op.delivery_status !== filters.delivery) return false;
      if (!q) return true;
      return (
        (op.client_display_name || '').toLowerCase().includes(q) ||
        (op.client_phone || '').toLowerCase().includes(q) ||
        (op.pair_symbol || '').toLowerCase().includes(q)
      );
    });
  }, [operations, filters]);

  return {
    state: { operations: filteredOperations, stats, loading, filters, hasActiveFilters },
    actions: { setFilters, resetFilters },
  };
}
