'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AdminService } from '@/services/adminService';
import { ratesService } from '@/services/ratesService';
import {
  CurrencyPairData,
  CreateCurrencyPairData,
  CurrencyData,
} from '@/types/admin';
import { useConfirm } from '@/hooks/useConfirm';
import {
  emptyPairFilters,
  filterPairs,
  hasActivePairFilters,
  summarizePairs,
  type PairFilters,
} from '../_lib/pairFilters';

const adminService = new AdminService();

/**
 * Con ~22 pares el listado cabe entero en una sola respuesta, así que se pide
 * una vez y se filtra en el navegador: la búsqueda es instantánea y las cifras
 * de la cabecera describen el sistema completo, no la página visible.
 */
const PAIRS_PAGE_SIZE = 200;

export interface BinanceConfigDraft {
  banks_to_track: string[];
  amount_to_track: number | null;
}

export interface PairRateInfo {
  isManual: boolean;
  currentRate?: number;
  automaticRate?: number;
}

const emptyBinanceConfig: BinanceConfigDraft = {
  banks_to_track: [],
  amount_to_track: null,
};

export function useCurrencyPairs() {
  const confirm = useConfirm();
  const router = useRouter();

  const [allPairs, setAllPairs] = useState<CurrencyPairData[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [basePairs, setBasePairs] = useState<CurrencyPairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PairFilters>(emptyPairFilters);
  const [error, setError] = useState<string>('');

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [binanceTargetPair, setBinanceTargetPair] = useState<CurrencyPairData | null>(null);
  const [binanceConfig, setBinanceConfig] = useState<BinanceConfigDraft>(emptyBinanceConfig);

  const [historyPair, setHistoryPair] = useState<CurrencyPairData | null>(null);

  const [manualRatePair, setManualRatePair] = useState<CurrencyPairData | null>(null);
  const [manualRateInfo, setManualRateInfo] = useState<PairRateInfo>({ isManual: false });
  const [manualRateLoading, setManualRateLoading] = useState(false);

  const loadCurrencyPairs = useCallback(async () => {
    const result = await adminService.getCurrencyPairs(0, PAIRS_PAGE_SIZE);
    if (result.success && result.data) {
      setAllPairs(result.data.pairs);
    }
    setLoading(false);
  }, []);

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

  useEffect(() => {
    Promise.all([loadCurrencyPairs(), loadCurrencies(), loadBasePairs()]);
  }, [loadCurrencyPairs, loadCurrencies, loadBasePairs]);

  const refresh = useCallback(() => loadCurrencyPairs(), [loadCurrencyPairs]);

  const resetFilters = useCallback(() => setFilters(emptyPairFilters), []);

  const hasFilters = hasActivePairFilters(filters);
  const pairs = useMemo(() => filterPairs(allPairs, filters), [allPairs, filters]);
  const summary = useMemo(() => summarizePairs(allPairs), [allPairs]);

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
    async (formData: CreateCurrencyPairData): Promise<boolean> => {
      setError('');
      if (!formData.binance_tracked) return true;

      const fromCurrency = currencies.find((c) => c.uuid === formData.from_currency_uuid);
      const toCurrency = currencies.find((c) => c.uuid === formData.to_currency_uuid);
      const validTypes =
        (fromCurrency?.currency_type === 'FIAT' && toCurrency?.currency_type === 'CRYPTO') ||
        (fromCurrency?.currency_type === 'CRYPTO' && toCurrency?.currency_type === 'FIAT');
      if (!validTypes) {
        setError('Los pares de Binance deben ser entre monedas FIAT y CRYPTO');
        return false;
      }

      if (!formData.banks_to_track?.length) {
        setError('Debe seleccionar al menos un método de pago');
        return false;
      }

      if (!formData.amount_to_track || formData.amount_to_track <= 0) {
        setError('El monto debe ser mayor a 0');
        return false;
      }

      const fiatCurrency = getFiatCurrencyFromPair(
        formData.from_currency_uuid,
        formData.to_currency_uuid
      );

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
      if (!result.success) {
        toast.error(result.error || 'Error al crear el par');
        return;
      }

      setShowCreateModal(false);
      setError('');
      toast.success('Par creado correctamente');

      // El modal solo pide lo esencial: seguimos en la pantalla del par para
      // terminar de configurarlo (USDT, redondeo, comisiones).
      if (result.data) {
        router.push(`/admin/currency-pairs/${result.data.uuid}`);
        return;
      }
      refresh();
    },
    [refresh, router]
  );

  const handleDelete = useCallback(
    async (uuid: string) => {
      const pairToDelete = allPairs.find((p) => p.uuid === uuid);
      if (pairToDelete && !pairToDelete.base_pair_uuid) {
        const derivedPairs = allPairs.filter((p) => p.base_pair_uuid === uuid);
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
    [allPairs, confirm, refresh]
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

    const result = await adminService.updateCurrencyPairStatus(binanceTargetPair.uuid, {
      is_active: binanceTargetPair.is_active,
      is_monitored: binanceTargetPair.is_monitored,
      binance_tracked: true,
      banks_to_track: binanceConfig.banks_to_track,
      amount_to_track: binanceConfig.amount_to_track,
    });
    if (!result.success) {
      toast.error(result.error || 'Error al actualizar el par');
      return;
    }

    refresh();
    closeBinanceConfig();
    toast.success('Configuración de Binance actualizada');
  }, [
    binanceTargetPair,
    binanceConfig,
    validateTradeMethodsWithBinance,
    refresh,
    closeBinanceConfig,
  ]);

  const openHistory = useCallback((pair: CurrencyPairData) => setHistoryPair(pair), []);
  const closeHistory = useCallback(() => setHistoryPair(null), []);

  const openManualRate = useCallback((pair: CurrencyPairData) => {
    setManualRatePair(pair);
    // La tasa ya viene en el listado; no hace falta volver a pedirla.
    setManualRateInfo({
      isManual: pair.current_rate?.is_manual ?? false,
      currentRate: pair.current_rate?.rate,
      automaticRate: pair.current_rate?.automatic_rate ?? undefined,
    });
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

    const ok = await confirm({
      title: '¿Volver al precio automático?',
      description: 'El sistema volverá a seguir la tasa automática para este par.',
      confirmText: 'Volver al automático',
      variant: 'destructive',
    });
    if (!ok) return;

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
  }, [manualRatePair, confirm, closeManualRate, refresh]);

  /** Se usa como fallback cuando el par aún no tiene tasa en el listado. */
  const fetchRate = useCallback(async (pair: CurrencyPairData) => {
    const result = await ratesService.getRateByPair(pair.uuid);
    if (result.success && result.data) {
      setManualRateInfo({
        isManual: result.data.is_manual,
        currentRate: result.data.manual_rate ?? result.data.rate,
        automaticRate: result.data.automatic_rate ?? undefined,
      });
    }
  }, []);

  return {
    state: {
      pairs,
      allPairs,
      currencies,
      basePairs,
      summary,
      loading,
      filters,
      hasActiveFilters: hasFilters,
      error,
      showCreateModal,
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
      refresh,
      openCreate: () => setShowCreateModal(true),
      closeCreate: () => setShowCreateModal(false),
      openEdit: (pair: CurrencyPairData) => router.push(`/admin/currency-pairs/${pair.uuid}`),
      handleCreate,
      handleDelete,
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
      fetchRate,
    },
  };
}
