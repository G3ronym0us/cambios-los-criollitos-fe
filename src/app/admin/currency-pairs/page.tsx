"use client";

import { useState, useEffect } from 'react';
import { AdminService } from '@/services/adminService';
import { 
  CurrencyPairData, 
  CreateCurrencyPairData, 
  UpdateCurrencyPairData,
  CurrencyData
} from '@/types/admin';
import { Trash2, Edit, Plus, Eye, EyeOff, ToggleLeft, ToggleRight, TrendingUp, Bitcoin, X, History, Settings } from 'lucide-react';
import TradeMethodSelector from '@/components/TradeMethodSelector';
import RateHistoryModal from './RateHistoryModal';
import ManualRateDialog from '@/components/ManualRateDialog';

const adminService = new AdminService();

export default function CurrencyPairsAdminPage() {
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPair, setEditingPair] = useState<CurrencyPairData | null>(null);
  const [formData, setFormData] = useState<CreateCurrencyPairData>({
    from_currency_id: 0,
    to_currency_id: 0,
    description: '',
    is_active: true,
    is_monitored: true,
    binance_tracked: false,
    banks_to_track: [],
    amount_to_track: null,
  });
  const [stats, setStats] = useState<{
    total_pairs: number;
    active_pairs: number;
    monitored_pairs: number;
  } | null>(null);
  const [filters, setFilters] = useState({
    activeOnly: false,
    monitoredOnly: false,
  });
  const [showBinanceModal, setShowBinanceModal] = useState(false);
  const [binanceConfig, setBinanceConfig] = useState({
    banks_to_track: [] as string[],
    amount_to_track: null as number | null,
  });
  const [pairForBinanceConfig, setPairForBinanceConfig] = useState<CurrencyPairData | null>(null);
  const [error, setError] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPairForHistory, setSelectedPairForHistory] = useState<CurrencyPairData | null>(null);
  const [showManualRateDialog, setShowManualRateDialog] = useState(false);
  const [selectedPairForManualRate, setSelectedPairForManualRate] = useState<CurrencyPairData | null>(null);
  const [manualRateLoading, setManualRateLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      loadCurrencyPairs(),
      loadCurrencies(),
      loadStats()
    ]);
  }, [filters.activeOnly, filters.monitoredOnly]);

  const loadCurrencyPairs = async () => {
    setLoading(true);
    const result = await adminService.getCurrencyPairs(0, 100, filters.activeOnly, filters.monitoredOnly);
    if (result.success && result.data) {
      setPairs(result.data.pairs);
    }
    setLoading(false);
  };

  const loadCurrencies = async () => {
    const result = await adminService.getCurrencies();
    if (result.success && result.data) {
      setCurrencies(result.data.currencies);
    }
  };

  const loadStats = async () => {
    const result = await adminService.getCurrencyPairStats();
    if (result.success && result.data) {
      setStats({
        total_pairs: result.data.total_pairs,
        active_pairs: result.data.active_pairs,
        monitored_pairs: result.data.monitored_pairs
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.from_currency_id === formData.to_currency_id) {
      alert('Las monedas de origen y destino deben ser diferentes');
      return;
    }
    
    const isValid = await validateBinanceForm();
    if (!isValid) {
      return;
    }
    
    const result = await adminService.createCurrencyPair(formData);
    if (result.success) {
      setShowCreateModal(false);
      resetForm();
      loadCurrencyPairs();
      loadStats();
    } else {
      alert(result.error || 'Error al crear el par');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPair) return;
    
    const isValid = await validateBinanceForm();
    if (!isValid) {
      return;
    }
    
    const updateData: UpdateCurrencyPairData = {
      description: formData.description,
      is_active: formData.is_active,
      is_monitored: formData.is_monitored,
      binance_tracked: formData.binance_tracked,
      banks_to_track: formData.banks_to_track,
      amount_to_track: formData.amount_to_track,
    };
    
    const result = await adminService.updateCurrencyPair(editingPair.id, updateData);
    if (result.success) {
      setEditingPair(null);
      resetForm();
      loadCurrencyPairs();
      loadStats();
    } else {
      alert(result.error || 'Error al actualizar el par');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este par de monedas?')) {
      const result = await adminService.deleteCurrencyPair(id);
      if (result.success) {
        loadCurrencyPairs();
        loadStats();
      } else {
        alert(result.error || 'Error al eliminar el par');
      }
    }
  };

  const handleToggleActive = async (pair: CurrencyPairData) => {
    const result = await adminService.updateCurrencyPairStatus(pair.id, {
      is_active: !pair.is_active,
      is_monitored: pair.is_monitored,
      binance_tracked: pair.binance_tracked,
      banks_to_track: pair.banks_to_track,
      amount_to_track: pair.amount_to_track
    });
    if (result.success) {
      loadCurrencyPairs();
      loadStats();
    }
  };

  const handleToggleMonitored = async (pair: CurrencyPairData) => {
    const result = await adminService.updateCurrencyPairStatus(pair.id, {
      is_active: pair.is_active,
      is_monitored: !pair.is_monitored,
      binance_tracked: pair.binance_tracked,
      banks_to_track: pair.banks_to_track,
      amount_to_track: pair.amount_to_track
    });
    if (result.success) {
      loadCurrencyPairs();
      loadStats();
    }
  };

  const handleToggleBinanceTracked = (pair: CurrencyPairData) => {
    if (!pair.binance_tracked) {
      // Validar tipos de moneda antes de abrir modal
      const validTypes = (
        (pair.from_currency.currency_type === 'FIAT' && pair.to_currency.currency_type === 'CRYPTO') ||
        (pair.from_currency.currency_type === 'CRYPTO' && pair.to_currency.currency_type === 'FIAT')
      );
      
      if (!validTypes) {
        alert('Los pares de Binance deben ser entre monedas FIAT y CRYPTO');
        return;
      }
      
      // Abrir modal para configurar Binance
      setPairForBinanceConfig(pair);
      setBinanceConfig({
        banks_to_track: pair.banks_to_track || [],
        amount_to_track: pair.amount_to_track || null,
      });
      setShowBinanceModal(true);
    } else {
      // Desactivar Binance tracking
      handleUpdateBinanceStatus(pair, false, null, null);
    }
  };

  const handleUpdateBinanceStatus = async (
    pair: CurrencyPairData, 
    binance_tracked: boolean, 
    banks_to_track: string[] | null, 
    amount_to_track: number | null
  ) => {
    const result = await adminService.updateCurrencyPairStatus(pair.id, {
      is_active: pair.is_active,
      is_monitored: pair.is_monitored,
      binance_tracked,
      banks_to_track,
      amount_to_track
    });
    if (result.success) {
      loadCurrencyPairs();
      loadStats();
    } else {
      alert(result.error || 'Error al actualizar la configuración');
    }
  };

  const handleSaveBinanceConfig = async () => {
    setError('');
    
    // Validaciones básicas
    if (!binanceConfig.banks_to_track.length) {
      setError('Debe seleccionar al menos un método de pago');
      return;
    }
    
    if (!binanceConfig.amount_to_track || binanceConfig.amount_to_track <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    
    // Validación contra API de Binance
    if (pairForBinanceConfig) {
      const fiatCurrency = pairForBinanceConfig.from_currency.currency_type === 'FIAT' 
        ? pairForBinanceConfig.from_currency.symbol 
        : pairForBinanceConfig.to_currency.symbol;
      
      const isValid = await validateTradeMethodsWithBinance(fiatCurrency, binanceConfig.banks_to_track);
      if (!isValid) {
        return;
      }
      
      handleUpdateBinanceStatus(
        pairForBinanceConfig,
        true,
        binanceConfig.banks_to_track,
        binanceConfig.amount_to_track
      );
      setShowBinanceModal(false);
      setPairForBinanceConfig(null);
    }
  };

  const resetForm = () => {
    setFormData({
      from_currency_id: 0,
      to_currency_id: 0,
      description: '',
      is_active: true,
      is_monitored: true,
      binance_tracked: false,
      banks_to_track: [],
      amount_to_track: null,
    });
  };

  // Helper functions
  const getFiatCurrencyFromPair = (fromCurrencyId: number, toCurrencyId: number): string | null => {
    const fromCurrency = currencies.find(c => c.id === fromCurrencyId);
    const toCurrency = currencies.find(c => c.id === toCurrencyId);
    
    if (fromCurrency?.currency_type === 'FIAT') {
      return fromCurrency.symbol;
    } else if (toCurrency?.currency_type === 'FIAT') {
      return toCurrency.symbol;
    }
    
    return null;
  };

  // Validate trade methods against Binance API
  const validateTradeMethodsWithBinance = async (fiatCurrency: string, selectedMethods: string[]): Promise<boolean> => {
    try {
      const result = await adminService.getBinanceTradeMethodsByUrl(fiatCurrency);
      if (result.success && result.data) {
        const validMethods = result.data.map(method => method.identifier);
        const invalidMethods = selectedMethods.filter(method => !validMethods.includes(method));
        
        if (invalidMethods.length > 0) {
          setError(`Métodos de pago inválidos para ${fiatCurrency}: ${invalidMethods.join(', ')}`);
          return false;
        }
        return true;
      } else {
        // If we can't fetch from Binance, allow the form to proceed with a warning
        console.warn('Could not validate trade methods with Binance:', result.error);
        return true;
      }
    } catch (err) {
      console.error('Error validating trade methods:', err);
      return true; // Allow to proceed if validation fails
    }
  };

  const validateBinanceForm = async (): Promise<boolean> => {
    setError('');
    
    if (formData.binance_tracked) {
      // Validar tipos de moneda
      const fromCurrency = currencies.find(c => c.id === formData.from_currency_id);
      const toCurrency = currencies.find(c => c.id === formData.to_currency_id);
      
      const validTypes = (
        (fromCurrency?.currency_type === 'FIAT' && toCurrency?.currency_type === 'CRYPTO') ||
        (fromCurrency?.currency_type === 'CRYPTO' && toCurrency?.currency_type === 'FIAT')
      );
      
      if (!validTypes) {
        setError('Los pares de Binance deben ser entre monedas FIAT y CRYPTO');
        return false;
      }
      
      // Validar campos requeridos
      if (!formData.banks_to_track?.length) {
        setError('Debe seleccionar al menos un método de pago');
        return false;
      }
      
      if (!formData.amount_to_track || formData.amount_to_track <= 0) {
        setError('El monto debe ser mayor a 0');
        return false;
      }
      
      // Validate against Binance API
      const fiatCurrency = getFiatCurrencyFromPair(formData.from_currency_id, formData.to_currency_id);
      if (fiatCurrency) {
        const isValid = await validateTradeMethodsWithBinance(fiatCurrency, formData.banks_to_track);
        if (!isValid) {
          return false;
        }
      }
    }
    
    return true;
  };

  const openEditModal = (pair: CurrencyPairData) => {
    setEditingPair(pair);
    setFormData({
      from_currency_id: pair.from_currency_id,
      to_currency_id: pair.to_currency_id,
      description: pair.description,
      is_active: pair.is_active,
      is_monitored: pair.is_monitored,
      binance_tracked: pair.binance_tracked,
      banks_to_track: pair.banks_to_track || [],
      amount_to_track: pair.amount_to_track,
    });
  };

  const handleShowHistory = (pair: CurrencyPairData) => {
    setSelectedPairForHistory(pair);
    setShowHistoryModal(true);
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedPairForHistory(null);
  };

  const handleOpenManualRateDialog = (pair: CurrencyPairData) => {
    setSelectedPairForManualRate(pair);
    setShowManualRateDialog(true);
  };

  const handleCloseManualRateDialog = () => {
    setShowManualRateDialog(false);
  };

  const handleSetManualRate = async (rate: number): Promise<boolean> => {
    if (!selectedPairForManualRate) return false;
    
    setManualRateLoading(true);
    try {
      const result = await adminService.setManualRate(
        selectedPairForManualRate.from_currency.symbol,
        selectedPairForManualRate.to_currency.symbol,
        rate
      );
      
      if (result.success) {
        setSelectedPairForManualRate(null);
        // Could refresh data here if needed
        return true;
      } else {
        alert(result.error || 'Error al establecer precio manual');
        return false;
      }
    } catch (error) {
      alert('Error de conexión al servidor');
      return false;
    } finally {
      setManualRateLoading(false);
    }
  };

  const handleRemoveManualRate = async (): Promise<boolean> => {
    if (!selectedPairForManualRate) return false;
    
    setManualRateLoading(true);
    try {
      const result = await adminService.removeManualRate(
        selectedPairForManualRate.from_currency.symbol,
        selectedPairForManualRate.to_currency.symbol
      );
      
      if (result.success) {
        setSelectedPairForManualRate(null);
        // Could refresh data here if needed
        return true;
      } else {
        alert(result.error || 'Error al remover precio manual');
        return false;
      }
    } catch (error) {
      alert('Error de conexión al servidor');
      return false;
    } finally {
      setManualRateLoading(false);
    }
  };


  if (loading) {
    return <div className="text-center py-8">Cargando pares de monedas...</div>;
  }

  return (
    <div>
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Gestión de Pares de Monedas</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Nuevo Par
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <TrendingUp className="text-blue-500 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Pares</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_pairs}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <ToggleRight className="text-green-500 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Pares Activos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_pairs}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <Eye className="text-purple-500 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Monitoreados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.monitored_pairs}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.activeOnly}
              onChange={(e) => setFilters({ ...filters, activeOnly: e.target.checked })}
              className="mr-2"
            />
            Solo activos
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.monitoredOnly}
              onChange={(e) => setFilters({ ...filters, monitoredOnly: e.target.checked })}
              className="mr-2"
            />
            Solo monitoreados
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Par
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monitoreado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Binance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pairs.map((pair) => (
              <tr key={pair.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {pair.display_name}
                        {pair.binance_tracked && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                            📊 Binance
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pair.from_currency.name} → {pair.to_currency.name}
                      </div>
                      {pair.binance_tracked && pair.banks_to_track && pair.amount_to_track && (
                        <div className="text-xs text-gray-400 mt-1">
                          <div>Bancos: {pair.banks_to_track.join(', ')}</div>
                          <div>Monto: ${pair.amount_to_track}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {pair.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(pair)}
                    className="flex items-center"
                  >
                    {pair.is_active ? (
                      <ToggleRight className="text-green-600" size={20} />
                    ) : (
                      <ToggleLeft className="text-gray-400" size={20} />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleMonitored(pair)}
                    className="flex items-center"
                  >
                    {pair.is_monitored ? (
                      <Eye className="text-purple-600" size={20} />
                    ) : (
                      <EyeOff className="text-gray-400" size={20} />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleBinanceTracked(pair)}
                    className="flex items-center"
                  >
                    {pair.binance_tracked ? (
                      <Bitcoin className="text-orange-500" size={20} />
                    ) : (
                      <Bitcoin className="text-gray-400" size={20} />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenManualRateDialog(pair)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Gestionar precio manual"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={() => handleShowHistory(pair)}
                      className="text-green-600 hover:text-green-900"
                      title="Ver historial de tasas"
                    >
                      <History size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(pair)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(pair.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nuevo Par de Monedas</h3>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda de Origen
                  </label>
                  <select
                    value={formData.from_currency_id}
                    onChange={(e) => setFormData({ ...formData, from_currency_id: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value={0}>Seleccionar moneda...</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name} ({currency.symbol}) - {currency.currency_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda de Destino
                  </label>
                  <select
                    value={formData.to_currency_id}
                    onChange={(e) => setFormData({ ...formData, to_currency_id: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value={0}>Seleccionar moneda...</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name} ({currency.symbol}) - {currency.currency_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Par activo
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_monitored}
                      onChange={(e) => setFormData({ ...formData, is_monitored: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Monitorear para scraping
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.binance_tracked}
                      onChange={(e) => setFormData({ ...formData, binance_tracked: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Rastreado en Binance P2P
                    </label>
                  </div>
                </div>
                
                {/* Campos adicionales para Binance */}
                {formData.binance_tracked && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Métodos de Pago de Binance <span className="text-red-500">*</span>
                      </label>
                      {getFiatCurrencyFromPair(formData.from_currency_id, formData.to_currency_id) ? (
                        <TradeMethodSelector
                          selectedMethods={formData.banks_to_track || []}
                          onChange={(methods) => setFormData({ ...formData, banks_to_track: methods })}
                          fiatCurrency={getFiatCurrencyFromPair(formData.from_currency_id, formData.to_currency_id) || ''}
                          className="w-full"
                        />
                      ) : (
                        <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                          <p className="text-sm text-gray-500">
                            Seleccione las monedas de origen y destino primero
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto a Trackear <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.amount_to_track || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          amount_to_track: e.target.value ? parseFloat(e.target.value) : null
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}
                
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Editar Par de Monedas</h3>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">Par:</p>
                  <p className="font-medium">{editingPair.display_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Par activo
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_monitored}
                      onChange={(e) => setFormData({ ...formData, is_monitored: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Monitorear para scraping
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.binance_tracked}
                      onChange={(e) => setFormData({ ...formData, binance_tracked: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Rastreado en Binance P2P
                    </label>
                  </div>
                </div>
                
                {/* Campos adicionales para Binance */}
                {formData.binance_tracked && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Métodos de Pago de Binance <span className="text-red-500">*</span>
                      </label>
                      {getFiatCurrencyFromPair(formData.from_currency_id, formData.to_currency_id) ? (
                        <TradeMethodSelector
                          selectedMethods={formData.banks_to_track || []}
                          onChange={(methods) => setFormData({ ...formData, banks_to_track: methods })}
                          fiatCurrency={getFiatCurrencyFromPair(formData.from_currency_id, formData.to_currency_id) || ''}
                          className="w-full"
                        />
                      ) : (
                        <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                          <p className="text-sm text-gray-500">
                            Este par no tiene moneda FIAT válida para Binance
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto a Trackear <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.amount_to_track || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          amount_to_track: e.target.value ? parseFloat(e.target.value) : null
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}
                
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => { setEditingPair(null); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Binance Configuration Modal */}
      {showBinanceModal && pairForBinanceConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Configurar Binance P2P</h3>
              <button
                onClick={() => setShowBinanceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Par:</strong> {pairForBinanceConfig.display_name}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {pairForBinanceConfig.from_currency.name} ({pairForBinanceConfig.from_currency.currency_type}) 
                  → {pairForBinanceConfig.to_currency.name} ({pairForBinanceConfig.to_currency.currency_type})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Métodos de Pago de Binance <span className="text-red-500">*</span>
                </label>
                {pairForBinanceConfig && (
                  <TradeMethodSelector
                    selectedMethods={binanceConfig.banks_to_track}
                    onChange={(methods) => setBinanceConfig({ ...binanceConfig, banks_to_track: methods })}
                    fiatCurrency={pairForBinanceConfig.from_currency.currency_type === 'FIAT' 
                      ? pairForBinanceConfig.from_currency.symbol 
                      : pairForBinanceConfig.to_currency.symbol}
                    className="w-full"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Seleccione los métodos de pago válidos desde Binance P2P
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto a Trackear <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={binanceConfig.amount_to_track || ''}
                  onChange={(e) => setBinanceConfig({
                    ...binanceConfig,
                    amount_to_track: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="100.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Monto en {pairForBinanceConfig.from_currency.currency_type === 'CRYPTO' ? 
                    pairForBinanceConfig.from_currency.symbol : 
                    pairForBinanceConfig.to_currency.symbol} para buscar órdenes
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={() => setShowBinanceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBinanceConfig}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center gap-2"
              >
                <Bitcoin size={16} />
                Activar Binance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedPairForHistory && (
        <RateHistoryModal
          isOpen={showHistoryModal}
          onClose={handleCloseHistoryModal}
          fromCurrency={selectedPairForHistory.from_currency.symbol}
          toCurrency={selectedPairForHistory.to_currency.symbol}
          pairDisplayName={selectedPairForHistory.display_name}
        />
      )}

      {/* Manual Rate Dialog */}
      {showManualRateDialog && selectedPairForManualRate && (
        <ManualRateDialog
          isOpen={showManualRateDialog}
          onClose={handleCloseManualRateDialog}
          onSetRate={handleSetManualRate}
          onRemoveRate={handleRemoveManualRate}
          fromCurrency={selectedPairForManualRate.from_currency.symbol}
          toCurrency={selectedPairForManualRate.to_currency.symbol}
          isLoading={manualRateLoading}
        />
      )}
    </div>
  );
}