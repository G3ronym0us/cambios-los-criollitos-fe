'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { transactionService } from '@/services/transactionService';
import { adminService } from '@/services/adminService';
import {
  TransactionData,
  TransactionFilters as TxFilters,
  TransactionStatus,
} from '@/types/transaction';
import { CurrencyPairData } from '@/types/admin';
import { useConfirm } from '@/hooks/useConfirm';

const PER_PAGE = 20;

const emptyFilters: TxFilters = {
  page: 1,
  per_page: PER_PAGE,
};

export function useTransactions() {
  const confirm = useConfirm();

  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [currencyPairs, setCurrencyPairs] = useState<CurrencyPairData[]>([]);

  const [filters, setFilters] = useState<TxFilters>(emptyFilters);
  const [draftFilters, setDraftFilters] = useState<TxFilters>(emptyFilters);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const result = await transactionService.getTransactions({ ...filters, page });
    if (result.success && result.data) {
      setTransactions(result.data.transactions);
      setTotal(result.data.total);
    } else {
      toast.error(result.error || 'Error al cargar las transacciones');
    }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    adminService.getCurrencyPairs(0, 200).then((result) => {
      if (result.success && result.data) {
        setCurrencyPairs(result.data.pairs);
      }
    });
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      !!filters.status_filter ||
      !!filters.currency_pair_uuid ||
      !!filters.start_date ||
      !!filters.end_date,
    [filters]
  );

  const applyFilters = useCallback(() => {
    setFilters({ ...draftFilters, page: 1, per_page: PER_PAGE });
    setPage(1);
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const goToPage = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(1, next), totalPages);
      setPage(clamped);
    },
    [totalPages]
  );

  const handleDelete = useCallback(
    async (transaction: TransactionData) => {
      const ok = await confirm({
        title: '¿Eliminar transacción?',
        description: `Se eliminará la transacción ${transaction.from_currency} → ${transaction.to_currency}. Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'destructive',
      });
      if (!ok) return;

      const result = await transactionService.deleteTransaction(transaction.uuid);
      if (result.success) {
        toast.success('Transacción eliminada correctamente');
        loadTransactions();
      } else {
        toast.error(result.error || 'Error al eliminar la transacción');
      }
    },
    [confirm, loadTransactions]
  );

  const setStatusDraft = useCallback((value: TransactionStatus | undefined) => {
    setDraftFilters((prev) => ({ ...prev, status_filter: value }));
  }, []);

  const setPairDraft = useCallback((value: string | undefined) => {
    setDraftFilters((prev) => ({ ...prev, currency_pair_uuid: value }));
  }, []);

  const setStartDateDraft = useCallback((value: string | undefined) => {
    setDraftFilters((prev) => ({ ...prev, start_date: value }));
  }, []);

  const setEndDateDraft = useCallback((value: string | undefined) => {
    setDraftFilters((prev) => ({ ...prev, end_date: value }));
  }, []);

  return {
    state: {
      transactions,
      total,
      page,
      totalPages,
      perPage: PER_PAGE,
      loading,
      filters,
      draftFilters,
      hasActiveFilters,
      currencyPairs,
    },
    actions: {
      goToPage,
      applyFilters,
      resetFilters,
      setStatusDraft,
      setPairDraft,
      setStartDateDraft,
      setEndDateDraft,
      handleDelete,
    },
  };
}
