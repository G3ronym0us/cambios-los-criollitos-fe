'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { transactionService } from '@/services/transactionService';
import type { UserProfitReport } from '@/types/transaction';

/** yyyy-mm-dd de hoy, para precargar el filtro cuando la home enlaza con `?desde=hoy`. */
function todayInputValue(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function useMyProfits() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<UserProfitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() =>
    searchParams.get('desde') === 'hoy' ? todayInputValue() : ''
  );
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
