'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { transactionService } from '@/services/transactionService';
import { userService } from '@/services/userService';
import type { UserProfitReport } from '@/types/transaction';
import type { CommissionUserResponse } from '@/types/user';

const PER_PAGE = 50;

export function useUserReport() {
  const searchParams = useSearchParams();
  const initialUserUuid = searchParams.get('user_uuid') || '';

  const [users, setUsers] = useState<CommissionUserResponse[]>([]);
  const [selectedUserUuid, setSelectedUserUuid] = useState<string>(initialUserUuid);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<UserProfitReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    userService.getAvailableCommissionUsers().then((result) => {
      if (result.success && result.data) {
        const data = result.data as unknown;
        setUsers(
          Array.isArray(data)
            ? (data as CommissionUserResponse[])
            : ((data as { users?: CommissionUserResponse[] }).users ?? [])
        );
      }
    });
  }, []);

  const loadReport = useCallback(
    async (targetPage: number) => {
      if (!selectedUserUuid) return;
      setLoading(true);
      const result = await transactionService.getUserProfitReport(
        selectedUserUuid,
        startDate || undefined,
        endDate || undefined,
        targetPage,
        PER_PAGE
      );
      if (result.success && result.data) {
        setReport(result.data);
      } else {
        toast.error(result.error || 'Error al cargar el reporte');
      }
      setLoading(false);
    },
    [selectedUserUuid, startDate, endDate]
  );

  // Auto-load when user_uuid comes from query param
  useEffect(() => {
    if (initialUserUuid) {
      loadReport(1);
    }
    // intentional: run only when initial uuid changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserUuid]);

  const handleApply = useCallback(() => {
    setPage(1);
    loadReport(1);
  }, [loadReport]);

  const handlePageChange = useCallback(
    (next: number) => {
      const target = Math.max(1, next);
      setPage(target);
      loadReport(target);
    },
    [loadReport]
  );

  const handleSelectUser = useCallback((uuid: string) => {
    setSelectedUserUuid(uuid);
    setReport(null);
    setPage(1);
  }, []);

  return {
    state: {
      users,
      selectedUserUuid,
      startDate,
      endDate,
      report,
      loading,
      page,
    },
    actions: {
      setStartDate,
      setEndDate,
      setSelectedUserUuid: handleSelectUser,
      handleApply,
      handlePageChange,
    },
  };
}
