'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { transactionService } from '@/services/transactionService';
import type { ProfitSummary } from '@/types/transaction';

const DEFAULT_PERIOD = 30;

export function useSummaryReport() {
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastDays, setLastDays] = useState<number>(DEFAULT_PERIOD);

  const loadSummary = useCallback(async (days: number) => {
    setLoading(true);
    const result = await transactionService.getSummaryReport(days);
    if (result.success && result.data) {
      setSummary(result.data);
    } else {
      toast.error(result.error || 'Error al cargar el resumen');
      setSummary(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSummary(lastDays);
  }, [lastDays, loadSummary]);

  return {
    state: {
      summary,
      loading,
      lastDays,
    },
    actions: {
      setLastDays,
    },
  };
}
