'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { transactionService } from '@/services/transactionService';
import type { UserProfitReport } from '@/types/transaction';

export function useMyProfits() {
  const [report, setReport] = useState<UserProfitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    const result = await transactionService.getMyProfits(
      startDate || undefined,
      endDate || undefined
    );
    if (result.success && result.data) {
      setReport(result.data);
    } else {
      toast.error(result.error || 'Error al cargar tus ganancias');
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return {
    state: {
      report,
      loading,
      startDate,
      endDate,
    },
    actions: {
      setStartDate,
      setEndDate,
      loadReport,
    },
  };
}
