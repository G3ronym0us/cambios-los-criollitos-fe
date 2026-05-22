'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AdminService } from '@/services/adminService';
import { ratesService } from '@/services/ratesService';
import {
  CurrencyPairData,
  CreateCurrencyPairData,
  UpdateCurrencyPairData,
  CurrencyData,
} from '@/types/admin';
import { useConfirm } from '@/hooks/useConfirm';

const adminService = new AdminService();

export interface CurrencyPairsFilters {
  activeOnly: boolean;
  monitoredOnly: boolean;
  currency: string;
}

export interface BinanceConfigDraft {
  banks_to_track: string[];
  amount_to_track: number | null;
}

export interface PairRateInfo {
  isManual: boolean;
  currentRate?: number;
  automaticRate?: number;
}

const emptyFilters: CurrencyPairsFilters = {
  activeOnly: false,
  monitoredOnly: false,
  currency: '',
};

const emptyBinanceConfig: BinanceConfigDraft = {
  banks_to_track: [],
  amount_to_track: null,
};

export function useCurrencyPairs() {
  const confirm = useConfirm();

  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [basePairs, setBasePairs] = useState<CurrencyPairData[]>([]);
  const [stats, setStats] = useState<{
    total_pairs: number;
    active_pairs: number;
    monitored_pairs: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CurrencyPairsFilters>(emptyFilters);
  const [error, setError] = useState<string>('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPair, setEditingPair] = useState<CurrencyPairData | null>(null);

  const [binanceTargetPair, setBinanceTargetPair] = useState<CurrencyPairData | null>(null);
  const [binanceConfig, setBinanceConfig] = useState<BinanceConfigDraft>(emptyBinanceConfig);

  const [historyPair, setHistoryPair] = useState<CurrencyPairData | null>(null);

  const [manualRatePair, setManualRatePair] = useState<CurrencyPairData | null>(null);
  const [manualRateInfo, setManualRateInfo] = useState<PairRateInfo>({ isManual: false });
  const [manualRateLoading, setManualRateLoading] = useState(false);

  const loadCurrencyPairs = useCallback(async () => {
    setLoading(true);
    const result = await adminService.getCurrencyPairs(
      0,
      100,
      filters.activeOnly,
      filters.monitoredOnly,
      filters.currency || undefined
    );
    if (result.success && result.data) {
      setPairs(result.data.pairs);
    }
    setLoading(false);
  }, [filters.activeOnly, filters.monitoredOnly, filters.currency]);

  const loadCurrencies = useCallback(async () => {
    const result = await adminService.getCurrencies();
    if (result.success && result.data) {
      setCurrencies(result.data.currencies);
    }
  }, []);

  const loadBasePairs = useCallback(async () => {
    const result = await adminService.getBasePairs();
    if (result.success && result.data) {
      setBasePairs(result.data);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const result = await adminService.getCurrencyPairStats();
    if (result.success && result.data) {
      setStats({
        total_pairs: result.data.total_pairs,
        active_pairs: result.data.active_pairs,
        monitored_pairs: result.data.monitored_pairs,
      });
    }
  }, []);

  useEffect(() => {
    Promise.all([loadCurrencyPairs(), loadCurrencies(), loadBasePairs(), loadStats()]);
  }, [loadCurrencyPairs, loadCurrencies, loadBasePairs, loadStats]);

  const refresh = useCallback(() => {
    loadCurrencyPairs();
    loadStats();
  }, [loadCurrencyPairs, loadStats]);

  const resetFilters = useCallback(() => setFilters(emptyFilters), []);

  const hasActiveFilters =
    filters.activeOnly || filters.monitoredOnly || !!filters.currency;

  const getFiatCurrencyFromPair = useCallback(
    (fromCurrencyUuid: string, toCurrencyUuid: string): string | null => {
      const fromCurrency = currencies.find((c) => c.uuid === fromCurrencyUuid);
      const toCurrency = currencies.find((c) => c.uuid === toCurrencyUuid);
      if (fromCurrency?.currency_type === 'FIAT') return fromCurrency.symbol;
      if (toCurrency?.currency_type === 'FIAT') return toCurrency.symbol;
      return null;
    },
    [currencies]
  );

  const validateTradeMethodsWithBinance = useCallback(
    async (fiatCurrency: string, selectedMethods: string[]): Promise<boolean> => {
      try {
        const result = await adminService.getBinanceTradeMethodsByUrl(fiatCurrency);
        if (result.success && result.data) {
          const validMethods = result.data.map((method) => method.identifier);
          const invalidMethods = selectedMethods.filter((m) => !validMethods.includes(m));
          if (invalidMethods.length > 0) {
            setError(`Métodos de pago inválidos para ${fiatCurrency}: ${invalidMethods.join(', ')}`);
            return false;
          }
          return true;
        }
        console.warn('Could not validate trade methods with Binance:', result.error);
        return true;
      } catch (err) {
        console.error('Error validating trade methods:', err);
        return true;
      }
    },
    []
  );

  const validateBinanceForm = useCallback(
    async (formData: CreateCurrencyPairData | UpdateCurrencyPairData): Promise<boolean> => {
      setError('');
      if (!formData.binance_tracked) return true;

      if ('from_currency_uuid' in formData && 'to_currency_uuid' in formData) {
        const fromCurrency = currencies.find((c) => c.uuid === formData.from_currency_uuid);
        const toCurrency = currencies.find((c) => c.uuid === formData.to_currency_uuid);
        const validTypes =
          (fromCurrency?.currency_type === 'FIAT' && toCurrency?.currency_type === 'CRYPTO') ||
          (fromCurrency?.currency_type === 'CRYPTO' && toCurrency?.currency_type === 'FIAT');
        if (!validTypes) {
          setError('Los pares de Binance deben ser entre monedas FIAT y CRYPTO');
          return false;
        }
      }

      if (!formData.banks_to_track?.length) {
        setError('Debe seleccionar al menos un método de pago');
        return false;
      }

      if (!formData.amount_to_track || formData.amount_to_track <= 0) {
        setError('El monto debe ser mayor a 0');
        return false;
      }

      let fiatCurrency: string | null = null;
      if ('from_currency_uuid' in formData && 'to_currency_uuid' in formData) {
        fiatCurrency = getFiatCurrencyFromPair(
          formData.from_currency_uuid,
          formData.to_currency_uuid
        );
      }

      if (fiatCurrency) {
        const ok = await validateTradeMethodsWithBinance(fiatCurrency, formData.banks_to_track);
        if (!ok) return false;
      }

      return true;
    },
    [currencies, getFiatCurrencyFromPair, validateTradeMethodsWithBinance]
  );

  const handleCreate = useCallback(
    async (formData: CreateCurrencyPairData) => {
      const result = await adminService.createCurrencyPair(formData);
      if (result.success) {
        setShowCreateModal(false);
        setError('');
        toast.success('Par creado correctamente');
        refresh();
      } else {
        toast.error(result.error || 'Error al crear el par');
      }
    },
    [refresh]
  );

  const handleUpdate = useCallback(
    async (updateData: UpdateCurrencyPairData) => {
      if (!editingPair) return;
      const result = await adminService.updateCurrencyPair(editingPair.uuid, updateData);
      if (result.success) {
        setEditingPair(null);
        setError('');
        toast.success('Par actualizado correctamente');
        refresh();
      } else {
        toast.error(result.error || 'Error al actualizar el par');
      }
    },
    [editingPair, refresh]
  );

  const handleDelete = useCallback(
    async (uuid: string) => {
      const pairToDelete = pairs.find((p) => p.uuid === uuid);
      if (pairToDelete && !pairToDelete.base_pair_uuid) {
        const derivedPairs = pairs.filter((p) => p.base_pair_uuid === uuid);
        if (derivedPairs.length > 0) {
          toast.error(
            `No se puede eliminar este par base porque tiene ${derivedPairs.length} par(es) derivado(s): ${derivedPairs.map((p) => p.display_name).join(', ')}`
          );
          return;
        }
      }

      const ok = await confirm({
        title: '¿Eliminar par de monedas?',
        description: 'Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        variant: 'destructive',
      });
      if (!ok) return;

      const result = await adminService.deleteCurrencyPair(uuid);
      if (result.success) {
        toast.success('Par eliminado correctamente');
        refresh();
      } else {
        toast.error(result.error || 'Error al eliminar el par');
      }
    },
    [pairs, confirm, refresh]
  );

  const updateStatus = useCallback(
    async (
      pair: CurrencyPairData,
      patch: Partial<{
        is_active: boolean;
        is_monitored: boolean;
        binance_tracked: boolean;
        banks_to_track: string[] | null;
        amount_to_track: number | null;
      }>
    ) => {
      const result = await adminService.updateCurrencyPairStatus(pair.uuid, {
        is_active: pair.is_active,
        is_monitored: pair.is_monitored,
        binance_tracked: pair.binance_tracked,
        banks_to_track: pair.banks_to_track,
        amount_to_track: pair.amount_to_track,
        ...patch,
      });
      if (result.success) {
        refresh();
      } else {
        toast.error(result.error || 'Error al actualizar el par');
      }
    },
    [refresh]
  );

  const handleToggleActive = useCallback(
    (pair: CurrencyPairData) => updateStatus(pair, { is_active: !pair.is_active }),
    [updateStatus]
  );

  const handleToggleMonitored = useCallback(
    (pair: CurrencyPairData) => updateStatus(pair, { is_monitored: !pair.is_monitored }),
    [updateStatus]
  );

  const handleToggleBinanceTracked = useCallback(
    (pair: CurrencyPairData) => {
      if (!pair.binance_tracked) {
        const validTypes =
          (pair.from_currency.currency_type === 'FIAT' &&
            pair.to_currency.currency_type === 'CRYPTO') ||
          (pair.from_currency.currency_type === 'CRYPTO' &&
            pair.to_currency.currency_type === 'FIAT');
        if (!validTypes) {
          toast.error('Los pares de Binance deben ser entre monedas FIAT y CRYPTO');
          return;
        }
        setBinanceTargetPair(pair);
        setBinanceConfig({
          banks_to_track: pair.banks_to_track || [],
          amount_to_track: pair.amount_to_track || null,
        });
      } else {
        updateStatus(pair, {
          binance_tracked: false,
          banks_to_track: null,
          amount_to_track: null,
        });
      }
    },
    [updateStatus]
  );

  const closeBinanceConfig = useCallback(() => {
    setBinanceTargetPair(null);
    setBinanceConfig(emptyBinanceConfig);
    setError('');
  }, []);

  const handleSaveBinanceConfig = useCallback(async () => {
    if (!binanceTargetPair) return;
    setError('');

    if (!binanceConfig.banks_to_track.length) {
      setError('Debe seleccionar al menos un método de pago');
      return;
    }
    if (!binanceConfig.amount_to_track || binanceConfig.amount_to_track <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    const fiatCurrency =
      binanceTargetPair.from_currency.currency_type === 'FIAT'
        ? binanceTargetPair.from_currency.symbol
        : binanceTargetPair.to_currency.symbol;

    const isValid = await validateTradeMethodsWithBinance(
      fiatCurrency,
      binanceConfig.banks_to_track
    );
    if (!isValid) return;

    await updateStatus(binanceTargetPair, {
      binance_tracked: true,
      banks_to_track: binanceConfig.banks_to_track,
      amount_to_track: binanceConfig.amount_to_track,
    });
    closeBinanceConfig();
    toast.success('Configuración de Binance actualizada');
  }, [
    binanceTargetPair,
    binanceConfig,
    validateTradeMethodsWithBinance,
    updateStatus,
    closeBinanceConfig,
  ]);

  const openHistory = useCallback((pair: CurrencyPairData) => setHistoryPair(pair), []);
  const closeHistory = useCallback(() => setHistoryPair(null), []);

  const openManualRate = useCallback(async (pair: CurrencyPairData) => {
    setManualRatePair(pair);
    setManualRateInfo({ isManual: false });
    const result = await ratesService.getRateByPair(pair.uuid);
    if (result.success && result.data) {
      setManualRateInfo({
        isManual: result.data.is_manual,
        currentRate: result.data.manual_rate ?? result.data.rate,
        automaticRate: result.data.automatic_rate ?? undefined,
      });
    }
  }, []);

  const closeManualRate = useCallback(() => {
    setManualRatePair(null);
    setManualRateInfo({ isManual: false });
  }, []);

  const handleSetManualRate = useCallback(
    async (rate: number): Promise<boolean> => {
      if (!manualRatePair) return false;
      setManualRateLoading(true);
      try {
        const result = await adminService.setManualRate(manualRatePair.uuid, rate);
        if (result.success) {
          toast.success('Precio manual actualizado');
          refresh();
          return true;
        }
        toast.error(result.error || 'Error al establecer precio manual');
        return false;
      } catch {
        toast.error('Error de conexión al servidor');
        return false;
      } finally {
        setManualRateLoading(false);
      }
    },
    [manualRatePair, refresh]
  );

  const handleRemoveManualRate = useCallback(async () => {
    if (!manualRatePair) return;
    setManualRateLoading(true);
    try {
      const result = await adminService.disableManualRate(manualRatePair.uuid);
      if (result.success) {
        toast.success('Precio manual desactivado');
        setManualRateInfo({ isManual: false });
        closeManualRate();
        refresh();
      } else {
        toast.error(result.error || 'Error al remover precio manual');
      }
    } catch {
      toast.error('Error de conexión al servidor');
    } finally {
      setManualRateLoading(false);
    }
  }, [manualRatePair, closeManualRate, refresh]);

  return {
    state: {
      pairs,
      currencies,
      basePairs,
      stats,
      loading,
      filters,
      hasActiveFilters,
      error,
      showCreateModal,
      editingPair,
      binanceTargetPair,
      binanceConfig,
      historyPair,
      manualRatePair,
      manualRateInfo,
      manualRateLoading,
    },
    actions: {
      setFilters,
      resetFilters,
      setError,
      openCreate: () => setShowCreateModal(true),
      closeCreate: () => setShowCreateModal(false),
      openEdit: setEditingPair,
      closeEdit: () => setEditingPair(null),
      handleCreate,
      handleUpdate,
      handleDelete,
      handleToggleActive,
      handleToggleMonitored,
      handleToggleBinanceTracked,
      setBinanceConfig,
      handleSaveBinanceConfig,
      closeBinanceConfig,
      openHistory,
      closeHistory,
      openManualRate,
      closeManualRate,
      handleSetManualRate,
      handleRemoveManualRate,
      validateBinanceForm,
      getFiatCurrencyFromPair,
    },
  };
}
