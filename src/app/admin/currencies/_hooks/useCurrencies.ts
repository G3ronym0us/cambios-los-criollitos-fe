'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminService } from '@/services/adminService';
import { CurrencyData, CreateCurrencyData, CurrencyType } from '@/types/admin';
import { useConfirm } from '@/hooks/useConfirm';

const adminService = new AdminService();

const emptyForm: CreateCurrencyData = {
  name: '',
  symbol: '',
  description: '',
  currency_type: CurrencyType.FIAT,
};

export interface CurrenciesFilters {
  search: string;
  type: 'ALL' | CurrencyType;
}

const emptyFilters: CurrenciesFilters = {
  search: '',
  type: 'ALL',
};

export function useCurrencies() {
  const confirm = useConfirm();

  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CurrenciesFilters>(emptyFilters);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyData | null>(null);
  const [formData, setFormData] = useState<CreateCurrencyData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadCurrencies = useCallback(async () => {
    setLoading(true);
    const result = await adminService.getCurrencies();
    if (result.success && result.data) {
      setCurrencies(result.data.currencies);
    } else {
      toast.error(result.error || 'Error al cargar las monedas');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  const resetFilters = useCallback(() => setFilters(emptyFilters), []);
  const hasActiveFilters = filters.search.trim() !== '' || filters.type !== 'ALL';

  const filteredCurrencies = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return currencies.filter((currency) => {
      if (filters.type !== 'ALL' && currency.currency_type !== filters.type) {
        return false;
      }
      if (!query) return true;
      return (
        currency.name.toLowerCase().includes(query) ||
        currency.symbol.toLowerCase().includes(query) ||
        currency.description.toLowerCase().includes(query)
      );
    });
  }, [currencies, filters]);

  const stats = useMemo(() => {
    const total = currencies.length;
    const crypto = currencies.filter((c) => c.currency_type === CurrencyType.CRYPTO).length;
    const fiat = total - crypto;
    return { total, crypto, fiat };
  }, [currencies]);

  const resetForm = useCallback(() => setFormData(emptyForm), []);

  const openCreate = useCallback(() => {
    resetForm();
    setShowCreateModal(true);
  }, [resetForm]);

  const closeCreate = useCallback(() => {
    setShowCreateModal(false);
    resetForm();
  }, [resetForm]);

  const openEdit = useCallback((currency: CurrencyData) => {
    setEditingCurrency(currency);
    setFormData({
      name: currency.name,
      symbol: currency.symbol,
      description: currency.description,
      currency_type: currency.currency_type,
    });
  }, []);

  const closeEdit = useCallback(() => {
    setEditingCurrency(null);
    resetForm();
  }, [resetForm]);

  const handleCreate = useCallback(async () => {
    setSubmitting(true);
    const result = await adminService.createCurrency(formData);
    setSubmitting(false);
    if (result.success) {
      toast.success('Moneda creada correctamente');
      closeCreate();
      loadCurrencies();
    } else {
      toast.error(result.error || 'Error al crear la moneda');
    }
  }, [formData, closeCreate, loadCurrencies]);

  const handleUpdate = useCallback(async () => {
    if (!editingCurrency) return;
    setSubmitting(true);
    const result = await adminService.updateCurrency(editingCurrency.uuid, formData);
    setSubmitting(false);
    if (result.success) {
      toast.success('Moneda actualizada correctamente');
      closeEdit();
      loadCurrencies();
    } else {
      toast.error(result.error || 'Error al actualizar la moneda');
    }
  }, [editingCurrency, formData, closeEdit, loadCurrencies]);

  const handleDelete = useCallback(
    async (currency: CurrencyData) => {
      const ok = await confirm({
        title: '¿Eliminar moneda?',
        description: `Se eliminará "${currency.name}" (${currency.symbol}). Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'destructive',
      });
      if (!ok) return;

      const result = await adminService.deleteCurrency(currency.uuid);
      if (result.success) {
        toast.success('Moneda eliminada correctamente');
        loadCurrencies();
      } else {
        toast.error(result.error || 'Error al eliminar la moneda');
      }
    },
    [confirm, loadCurrencies]
  );

  return {
    state: {
      currencies: filteredCurrencies,
      loading,
      stats,
      filters,
      hasActiveFilters,
      showCreateModal,
      editingCurrency,
      formData,
      submitting,
    },
    actions: {
      setFilters,
      resetFilters,
      setFormData,
      openCreate,
      closeCreate,
      openEdit,
      closeEdit,
      handleCreate,
      handleUpdate,
      handleDelete,
    },
  };
}
