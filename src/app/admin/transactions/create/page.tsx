"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { transactionService } from '@/services/transactionService';
import { userService } from '@/services/userService';
import { commissionConfigService } from '@/services/commissionConfigService';
import { adminService } from '@/services/adminService';
import { CreateTransactionData, ProfitSplitCreate, TransactionData } from '@/types/transaction';
import { CommissionUserResponse } from '@/types/user';
import { CommissionConfiguration } from '@/types/commissionConfig';
import { CurrencyPairData } from '@/types/admin';
import { ArrowLeft, Plus, Trash2, Calculator, Users, Settings } from 'lucide-react';
import Link from 'next/link';
import SimilarTransactionModal from '@/components/admin/SimilarTransactionModal';

// Interface for rates from /api/rates endpoint
interface RateData {
  from_currency: string;
  to_currency: string;
  rate: number;
  inverse_percentage: boolean;
}

export default function CreateTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commissionUsers, setCommissionUsers] = useState<CommissionUserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currencyPairs, setCurrencyPairs] = useState<CurrencyPairData[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(true);
  const [selectedPair, setSelectedPair] = useState<CurrencyPairData | null>(null);
  const [currentRate, setCurrentRate] = useState<{ rate: number; inverse_percentage: boolean } | null>(null);
  const [usdtRate, setUsdtRate] = useState<number | null>(null);
  const [allRates, setAllRates] = useState<RateData[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);

  // Commission configuration mode
  const [useConfigMode, setUseConfigMode] = useState<boolean>(true);
  const [availableConfigs, setAvailableConfigs] = useState<CommissionConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const [formData, setFormData] = useState({
    currency_pair_uuid: '',
    from_amount: 0,
    to_amount: 0,
    exchange_rate: 0,
    total_profit_percentage: 0,
    description: '',
    profit_splits: [] as ProfitSplitCreate[]
  });

  const [profitSplit, setProfitSplit] = useState<ProfitSplitCreate>({
    user_uuid: '',
    profit_percentage: 0
  });

  // Similar transaction warning modal
  const [showSimilarWarning, setShowSimilarWarning] = useState(false);
  const [similarTransaction, setSimilarTransaction] = useState<TransactionData | null>(null);
  const [pendingTransactionData, setPendingTransactionData] = useState<CreateTransactionData | null>(null);

  // Load all rates from calculator endpoint on mount
  useEffect(() => {
    const loadAllRates = async () => {
      setLoadingRates(true);
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/rates');
        if (response.ok) {
          const data: RateData[] = await response.json();
          setAllRates(data);
        } else {
          console.error('Error loading rates:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching rates:', error);
      } finally {
        setLoadingRates(false);
      }
    };

    loadAllRates();
  }, []);

  // Load currency pairs on mount
  useEffect(() => {
    const loadPairs = async () => {
      setLoadingPairs(true);
      const result = await adminService.getCurrencyPairs(0, 100, true); // Only active pairs
      if (result.success && result.data) {
        setCurrencyPairs(result.data.pairs);
      }
      setLoadingPairs(false);
    };

    loadPairs();
  }, []);

  // Load commission users on mount
  useEffect(() => {
    const loadCommissionUsers = async () => {
      setLoadingUsers(true);
      const result = await userService.getAvailableCommissionUsers();
      if (result.success && result.data) {
        setCommissionUsers(result.data);
      }
      setLoadingUsers(false);
    };

    loadCommissionUsers();
  }, []);

  // Load commission configurations when pair changes
  useEffect(() => {
    const loadConfigurations = async () => {
      if (!formData.currency_pair_uuid || !selectedPair) {
        setAvailableConfigs([]);
        return;
      }

      setLoadingConfigs(true);

      // Use the UUID from formData, not the pair_symbol
      const result = await commissionConfigService.getConfigsByPair(formData.currency_pair_uuid, true);
      if (result.success && result.data) {
        setAvailableConfigs(result.data.configurations);
      } else {
        setAvailableConfigs([]);
      }

      setLoadingConfigs(false);
    };

    if (useConfigMode) {
      loadConfigurations();
    }
  }, [formData.currency_pair_uuid, selectedPair, useConfigMode]);

  // Find USDT rate for a given currency symbol from loaded rates
  const findUsdtRate = (fromCurrencySymbol: string, rates: RateData[]): number | null => {
    // Direct: from_currency → USDT
    const direct = rates.find(
      r => r.from_currency === fromCurrencySymbol && r.to_currency === 'USDT'
    );
    if (direct) return direct.rate;

    // Inverse: USDT → from_currency (invert the rate)
    const inverse = rates.find(
      r => r.from_currency === 'USDT' && r.to_currency === fromCurrencySymbol
    );
    if (inverse && inverse.rate > 0) return 1 / inverse.rate;

    return null;
  };

  // Handle currency pair selection
  const handlePairChange = (pairUuid: string) => {
    const pair = currencyPairs.find(p => (p.uuid || `pair-${p.uuid}`) === pairUuid);
    setSelectedPair(pair || null);
    setSelectedConfig(null); // Reset config selection

    if (pair) {
      // Find the rate for this pair from the loaded rates using from_currency and to_currency
      const foundRate = allRates.find(
        rate => rate.from_currency === pair.from_currency.symbol &&
                rate.to_currency === pair.to_currency.symbol
      );

      // Find USDT rate for the from_currency
      setUsdtRate(findUsdtRate(pair.from_currency.symbol, allRates));

      if (foundRate) {
        setCurrentRate({
          rate: foundRate.rate,
          inverse_percentage: foundRate.inverse_percentage
        });

        // Update form with the rate and calculate to_amount if from_amount exists
        setFormData(prev => {
          const newFormData = {
            ...prev,
            currency_pair_uuid: pairUuid,
            exchange_rate: foundRate.rate,
            to_amount: prev.from_amount > 0
              ? calculateToAmountWithRate(prev.from_amount, foundRate.rate, foundRate.inverse_percentage)
              : 0
          };
          return newFormData;
        });
      } else {
        // No rate found for this pair
        setCurrentRate(null);
        setFormData(prev => ({
          ...prev,
          currency_pair_uuid: pairUuid,
          exchange_rate: 0,
          to_amount: 0
        }));
      }
    } else {
      setCurrentRate(null);
      setUsdtRate(null);
      setFormData(prev => ({
        ...prev,
        currency_pair_uuid: pairUuid,
        exchange_rate: 0,
        to_amount: 0
      }));
    }
  };

  // Calculate to_amount based on from_amount, exchange_rate and inverse_percentage
  const calculateToAmountWithRate = (fromAmount: number, rate: number, inversePercentage: boolean) => {
    if (inversePercentage) {
      // If inverse_percentage is true, divide
      return fromAmount / rate;
    } else {
      // If inverse_percentage is false, multiply
      return fromAmount * rate;
    }
  };

  // Calculate to_amount (wrapper that uses current rate state)
  const calculateToAmount = (fromAmount: number) => {
    if (!currentRate) return 0;
    return calculateToAmountWithRate(fromAmount, currentRate.rate, currentRate.inverse_percentage);
  };

  // Calculate profit amount
  const calculateProfitAmount = () => {
    return (formData.to_amount * (formData.total_profit_percentage || 0)) / 100;
  };

  // Calculate total profit percentage from splits
  const getTotalSplitPercentage = () => {
    return (formData.profit_splits || []).reduce((sum, split) => sum + split.profit_percentage, 0);
  };

  // Get user display name
  const getUserDisplayName = (userUuid: string) => {
    const user = commissionUsers.find(u => u.uuid === userUuid);
    if (!user) return `Usuario ${userUuid}`;
    return user.full_name || user.username;
  };

  const handleAddProfitSplit = () => {
    if (!profitSplit.user_uuid) {
      alert('Por favor selecciona un usuario');
      return;
    }

    if (profitSplit.profit_percentage <= 0) {
      alert('El porcentaje debe ser mayor a 0');
      return;
    }

    const totalSplit = getTotalSplitPercentage() + profitSplit.profit_percentage;
    if (totalSplit > (formData.total_profit_percentage || 0)) {
      alert(`La suma de los porcentajes no puede exceder ${formData.total_profit_percentage}%`);
      return;
    }

    setFormData({
      ...formData,
      profit_splits: [...(formData.profit_splits || []), { ...profitSplit }]
    });

    setProfitSplit({ user_uuid: '', profit_percentage: 0 });
  };

  const handleRemoveProfitSplit = (index: number) => {
    setFormData({
      ...formData,
      profit_splits: (formData.profit_splits || []).filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent, forceCreate: boolean = false) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.currency_pair_uuid) {
      setError('Debe seleccionar un par de monedas');
      return;
    }

    if (formData.from_amount <= 0 || formData.to_amount <= 0) {
      setError('Los montos deben ser mayores a 0');
      return;
    }

    if (formData.exchange_rate <= 0) {
      setError('La tasa de cambio debe ser mayor a 0');
      return;
    }

    // Prepare data based on mode
    let transactionData: CreateTransactionData;

    if (useConfigMode) {
      // Using predefined configuration
      if (!selectedConfig) {
        setError('Debe seleccionar una configuración de comisión');
        return;
      }

      transactionData = {
        currency_pair_uuid: formData.currency_pair_uuid,
        from_amount: formData.from_amount,
        to_amount: formData.to_amount,
        exchange_rate: formData.exchange_rate,
        ...(usdtRate !== null && { usdt_rate: usdtRate }),
        description: formData.description,
        commission_config_uuid: selectedConfig
      };
    } else {
      // Manual splits
      if (!formData.profit_splits || formData.profit_splits.length === 0) {
        setError('Debe agregar al menos una distribución de ganancia');
        return;
      }

      const totalSplit = getTotalSplitPercentage();
      if (totalSplit !== formData.total_profit_percentage) {
        setError(`La suma de los porcentajes debe ser igual a ${formData.total_profit_percentage}%`);
        return;
      }

      transactionData = {
        currency_pair_uuid: formData.currency_pair_uuid,
        from_amount: formData.from_amount,
        to_amount: formData.to_amount,
        exchange_rate: formData.exchange_rate,
        ...(usdtRate !== null && { usdt_rate: usdtRate }),
        total_profit_percentage: formData.total_profit_percentage,
        description: formData.description,
        profit_splits: formData.profit_splits
      };
    }

    setLoading(true);

    const result = await transactionService.createTransaction(transactionData, forceCreate);

    if (result.success) {
      router.push('/admin/transactions');
    } else {
      // Check if it's a similar transaction warning
      if (result.error && typeof result.error === 'string') {
        try {
          const errorData = JSON.parse(result.error);
          if (errorData.requires_confirmation && errorData.similar_transaction) {
            // Show modal with similar transaction
            setSimilarTransaction(errorData.similar_transaction);
            setPendingTransactionData(transactionData);
            setShowSimilarWarning(true);
            setLoading(false);
            return;
          }
        } catch {
          // Not a JSON error, handle normally
        }
      }
      setError(result.error || 'Error al crear la transacción');
      setLoading(false);
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!pendingTransactionData) return;

    setShowSimilarWarning(false);
    setLoading(true);

    const result = await transactionService.createTransaction(pendingTransactionData, true);

    if (result.success) {
      router.push('/admin/transactions');
    } else {
      setError(result.error || 'Error al crear la transacción');
      setLoading(false);
    }
  };

  const handleCancelDuplicate = () => {
    setShowSimilarWarning(false);
    setSimilarTransaction(null);
    setPendingTransactionData(null);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={16} />
          Volver a Transacciones
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Nueva Transacción</h1>
        <p className="text-gray-600 text-sm mt-1">Registra una nueva transacción con distribución de ganancias</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles de la Transacción</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Currency Pair Selector */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Par de Monedas <span className="text-red-500">*</span>
              </label>
              {loadingPairs ? (
                <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500 text-sm">
                  Cargando pares de monedas...
                </div>
              ) : (
                <select
                  value={formData.currency_pair_uuid}
                  onChange={(e) => handlePairChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Seleccionar par de monedas...</option>
                  {currencyPairs.map((pair) => (
                    <option key={pair.uuid || `pair-${pair.uuid}`} value={pair.uuid || `pair-${pair.uuid}`}>
                      {pair.display_name || pair.pair_symbol} ({pair.from_currency.symbol} → {pair.to_currency.symbol})
                    </option>
                  ))}
                </select>
              )}
              {selectedPair && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedPair.from_currency.symbol} → {selectedPair.to_currency.symbol}
                  {selectedPair.description && ` - ${selectedPair.description}`}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto Origen <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.from_amount}
                onChange={(e) => {
                  const fromAmount = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    from_amount: fromAmount,
                    to_amount: calculateToAmount(fromAmount)
                  });
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                disabled={!selectedPair || loadingRates}
              />
              {selectedPair && (
                <p className="text-xs text-gray-500 mt-1">{selectedPair.from_currency.symbol}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasa de Cambio <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.exchange_rate}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value) || 0;
                  // Update currentRate to reflect manual change
                  if (currentRate) {
                    setCurrentRate({ ...currentRate, rate });
                  }
                  setFormData({
                    ...formData,
                    exchange_rate: rate,
                    to_amount: currentRate ? calculateToAmountWithRate(formData.from_amount, rate, currentRate.inverse_percentage) : 0
                  });
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                disabled={!selectedPair || loadingRates}
              />
              {loadingRates && (
                <p className="text-xs text-blue-600 mt-1">Cargando tasas...</p>
              )}
              {currentRate && !loadingRates && (
                <p className="text-xs text-gray-500 mt-1">
                  Tasa actual del mercado: {currentRate.rate.toFixed(4)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto Destino (calculado)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.to_amount}
                readOnly
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
              />
              {selectedPair && (
                <p className="text-xs text-gray-500 mt-1">{selectedPair.to_currency.symbol}</p>
              )}
            </div>

            {!useConfigMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porcentaje de Ganancia Total (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.total_profit_percentage}
                  onChange={(e) => setFormData({ ...formData, total_profit_percentage: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Ej: Cliente Juan - Venta de criptomonedas"
              />
            </div>
          </div>

          {/* Profit Calculation - Only show in manual mode */}
          {!useConfigMode && formData.to_amount > 0 && (formData.total_profit_percentage || 0) > 0 && selectedPair && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <Calculator size={20} />
                <div>
                  <p className="font-semibold">Ganancia Total Calculada</p>
                  <p className="text-2xl font-bold">
                    {calculateProfitAmount().toFixed(2)} {selectedPair.to_currency.symbol}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Commission Mode Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Método de Comisión</h2>

          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setUseConfigMode(true)}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                useConfigMode
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings size={20} className={useConfigMode ? 'text-blue-600' : 'text-gray-400'} />
                <div className="text-left">
                  <p className={`font-semibold ${useConfigMode ? 'text-blue-900' : 'text-gray-700'}`}>
                    Configuración Predefinida
                  </p>
                  <p className="text-sm text-gray-600">
                    Usar plantilla de comisión del par
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setUseConfigMode(false)}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                !useConfigMode
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={20} className={!useConfigMode ? 'text-blue-600' : 'text-gray-400'} />
                <div className="text-left">
                  <p className={`font-semibold ${!useConfigMode ? 'text-blue-900' : 'text-gray-700'}`}>
                    Distribución Manual
                  </p>
                  <p className="text-sm text-gray-600">
                    Configurar splits manualmente
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Predefined Configuration Mode */}
          {useConfigMode && (
            <div>
              {loadingConfigs ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 text-sm mt-2">Cargando configuraciones...</p>
                </div>
              ) : availableConfigs.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <p className="text-amber-800 font-medium mb-2">
                    No hay configuraciones para este par
                  </p>
                  <p className="text-amber-700 text-sm">
                    {!formData.currency_pair_uuid
                      ? 'Selecciona un par de monedas primero'
                      : 'Crea una configuración desde la gestión de pares'}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona una Configuración <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {availableConfigs.map((config) => (
                      <div
                        key={config.uuid}
                        onClick={() => setSelectedConfig(config.uuid)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedConfig === config.uuid
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{config.name}</h3>
                            {config.description && (
                              <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                            )}
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {config.total_percentage}%
                          </span>
                        </div>
                        <div className="mt-3 space-y-1">
                          {config.splits.map((split, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">
                                {split.user_full_name || split.username || `Usuario ${split.user_uuid}`}
                              </span>
                              <span className="font-medium text-gray-900">{split.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Profit Distribution */}
        {!useConfigMode && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Ganancias</h2>

            {/* Add Split Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Users size={14} />
                Usuario Comisionista
              </label>
              {loadingUsers ? (
                <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500 text-sm">
                  Cargando usuarios...
                </div>
              ) : (
                <select
                  value={profitSplit.user_uuid || ''}
                  onChange={(e) => setProfitSplit({ ...profitSplit, user_uuid: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Seleccionar usuario...</option>
                  {commissionUsers.map((user) => (
                    <option key={user.uuid} value={user.uuid}>
                      {user.full_name || user.username} - {user.email}
                    </option>
                  ))}
                </select>
              )}
              {commissionUsers.length === 0 && !loadingUsers && (
                <p className="text-xs text-amber-600 mt-1">
                  No hay usuarios comisionistas disponibles. Contacta al administrador.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={profitSplit.profit_percentage || ''}
                onChange={(e) => setProfitSplit({ ...profitSplit, profit_percentage: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="5.00"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddProfitSplit}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>
          </div>

          {/* Current Splits */}
          {(formData.profit_splits || []).length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-700">Distribución Actual:</p>
                <p className="text-sm text-gray-600">
                  Total: {getTotalSplitPercentage().toFixed(2)}% de {formData.total_profit_percentage || 0}%
                </p>
              </div>

              {(formData.profit_splits || []).map((split, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex-shrink-0 h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">
                            {getUserDisplayName(split.user_uuid).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {getUserDisplayName(split.user_uuid)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-11">
                        <span className="text-sm text-blue-700 font-semibold">
                          {split.profit_percentage}%
                        </span>
                        {formData.to_amount > 0 && (formData.total_profit_percentage || 0) > 0 && selectedPair && (
                          <span className="text-sm text-blue-600">
                            ≈ {((formData.to_amount * (formData.total_profit_percentage || 0) / 100) * (split.profit_percentage / (formData.total_profit_percentage || 1))).toFixed(2)} {selectedPair.to_currency.symbol}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveProfitSplit(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
              ))}
            </div>
          )}

            {getTotalSplitPercentage() > 0 && getTotalSplitPercentage() < (formData.total_profit_percentage || 0) && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ Falta asignar {((formData.total_profit_percentage || 0) - getTotalSplitPercentage()).toFixed(2)}%
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/admin/transactions"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear Transacción'}
          </button>
        </div>
      </form>

      {/* Similar Transaction Warning Modal */}
      {similarTransaction && (
        <SimilarTransactionModal
          isOpen={showSimilarWarning}
          similarTransaction={similarTransaction}
          onConfirm={handleConfirmDuplicate}
          onCancel={handleCancelDuplicate}
        />
      )}
    </div>
  );
}
