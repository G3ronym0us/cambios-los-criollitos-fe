"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminService } from "@/services/adminService";
import { ratesService } from "@/services/ratesService";
import {
  CurrencyPairData,
  CreateCurrencyPairData,
  UpdateCurrencyPairData,
  CurrencyData,
  PairType,
} from "@/types/admin";
import {
  Trash2,
  Edit,
  Plus,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Bitcoin,
  X,
  History,
  Settings,
  ArrowLeftRight,
  DollarSign,
} from "lucide-react";
import TradeMethodSelector from "@/components/TradeMethodSelector";
import RateHistoryModal from "./RateHistoryModal";
import ManualRateDialog from "@/components/ManualRateDialog";
import CreateCurrencyPairModal from "@/components/admin/CreateCurrencyPairModal";
import EditCurrencyPairModal from "@/components/admin/EditCurrencyPairModal";

const adminService = new AdminService();

export default function CurrencyPairsAdminPage() {
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [basePairs, setBasePairs] = useState<CurrencyPairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPair, setEditingPair] = useState<CurrencyPairData | null>(null);
  const [stats, setStats] = useState<{
    total_pairs: number;
    active_pairs: number;
    monitored_pairs: number;
  } | null>(null);
  const [filters, setFilters] = useState({
    activeOnly: false,
    monitoredOnly: false,
    currency: '',
  });
  const [showBinanceModal, setShowBinanceModal] = useState(false);
  const [binanceConfig, setBinanceConfig] = useState({
    banks_to_track: [] as string[],
    amount_to_track: null as number | null,
  });
  const [pairForBinanceConfig, setPairForBinanceConfig] =
    useState<CurrencyPairData | null>(null);
  const [error, setError] = useState<string>("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPairForHistory, setSelectedPairForHistory] =
    useState<CurrencyPairData | null>(null);
  const [showManualRateDialog, setShowManualRateDialog] = useState(false);
  const [selectedPairForManualRate, setSelectedPairForManualRate] =
    useState<CurrencyPairData | null>(null);
  const [manualRateLoading, setManualRateLoading] = useState(false);
  const [selectedPairRateInfo, setSelectedPairRateInfo] = useState<{
    isManual: boolean;
    currentRate?: number;
    automaticRate?: number;
  }>({ isManual: false });

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

  useEffect(() => {
    Promise.all([
      loadCurrencyPairs(),
      loadCurrencies(),
      loadBasePairs(),
      loadStats(),
    ]);
  }, [filters.activeOnly, filters.monitoredOnly, filters.currency, loadCurrencyPairs]);

  const loadCurrencies = async () => {
    const result = await adminService.getCurrencies();
    if (result.success && result.data) {
      setCurrencies(result.data.currencies);
    }
  };

  const loadBasePairs = async () => {
    const result = await adminService.getBasePairs();
    if (result.success && result.data) {
      // El backend ya filtra por pair_type=BASE, is_active=true,
      // y (binance_tracked=true OR has_manual_rates)
      setBasePairs(result.data);
    }
  };

  const loadStats = async () => {
    const result = await adminService.getCurrencyPairStats();
    if (result.success && result.data) {
      setStats({
        total_pairs: result.data.total_pairs,
        active_pairs: result.data.active_pairs,
        monitored_pairs: result.data.monitored_pairs,
      });
    }
  };

  const handleCreate = async (formData: CreateCurrencyPairData) => {
    const result = await adminService.createCurrencyPair(formData);
    if (result.success) {
      setShowCreateModal(false);
      setError("");
      loadCurrencyPairs();
      loadStats();
    } else {
      alert(result.error || "Error al crear el par");
    }
  };

  const handleUpdate = async (updateData: UpdateCurrencyPairData) => {
    if (!editingPair) return;

    const result = await adminService.updateCurrencyPair(
      editingPair.uuid,
      updateData
    );
    if (result.success) {
      setEditingPair(null);
      setError("");
      loadCurrencyPairs();
      loadStats();
    } else {
      alert(result.error || "Error al actualizar el par");
    }
  };

  const handleDelete = async (uuid: string) => {
    // Check if this is a base pair with derived pairs
    const pairToDelete = pairs.find((p) => p.uuid === uuid);
    if (pairToDelete && !pairToDelete.base_pair_uuid) {
      // This is a potential base pair, check for derived pairs
      const derivedPairs = pairs.filter((p) => p.base_pair_uuid === uuid);
      if (derivedPairs.length > 0) {
        alert(
          `No se puede eliminar este par base porque tiene ${
            derivedPairs.length
          } par(es) derivado(s). Elimine primero los pares derivados: ${derivedPairs
            .map((p) => p.display_name)
            .join(", ")}`
        );
        return;
      }
    }

    if (confirm("¿Estás seguro de que quieres eliminar este par de monedas?")) {
      const result = await adminService.deleteCurrencyPair(uuid);
      if (result.success) {
        loadCurrencyPairs();
        loadStats();
      } else {
        alert(result.error || "Error al eliminar el par");
      }
    }
  };

  const handleToggleActive = async (pair: CurrencyPairData) => {
    const result = await adminService.updateCurrencyPairStatus(pair.uuid, {
      is_active: !pair.is_active,
      is_monitored: pair.is_monitored,
      binance_tracked: pair.binance_tracked,
      banks_to_track: pair.banks_to_track,
      amount_to_track: pair.amount_to_track,
    });
    if (result.success) {
      loadCurrencyPairs();
      loadStats();
    }
  };

  const handleToggleMonitored = async (pair: CurrencyPairData) => {
    const result = await adminService.updateCurrencyPairStatus(pair.uuid, {
      is_active: pair.is_active,
      is_monitored: !pair.is_monitored,
      binance_tracked: pair.binance_tracked,
      banks_to_track: pair.banks_to_track,
      amount_to_track: pair.amount_to_track,
    });
    if (result.success) {
      loadCurrencyPairs();
      loadStats();
    }
  };

  const handleToggleBinanceTracked = (pair: CurrencyPairData) => {
    if (!pair.binance_tracked) {
      // Validar tipos de moneda antes de abrir modal
      const validTypes =
        (pair.from_currency.currency_type === "FIAT" &&
          pair.to_currency.currency_type === "CRYPTO") ||
        (pair.from_currency.currency_type === "CRYPTO" &&
          pair.to_currency.currency_type === "FIAT");

      if (!validTypes) {
        alert("Los pares de Binance deben ser entre monedas FIAT y CRYPTO");
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
    const result = await adminService.updateCurrencyPairStatus(pair.uuid, {
      is_active: pair.is_active,
      is_monitored: pair.is_monitored,
      binance_tracked,
      banks_to_track,
      amount_to_track,
    });
    if (result.success) {
      loadCurrencyPairs();
      loadStats();
    } else {
      alert(result.error || "Error al actualizar la configuración");
    }
  };

  const handleSaveBinanceConfig = async () => {
    setError("");

    // Validaciones básicas
    if (!binanceConfig.banks_to_track.length) {
      setError("Debe seleccionar al menos un método de pago");
      return;
    }

    if (!binanceConfig.amount_to_track || binanceConfig.amount_to_track <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    // Validación contra API de Binance
    if (pairForBinanceConfig) {
      const fiatCurrency =
        pairForBinanceConfig.from_currency.currency_type === "FIAT"
          ? pairForBinanceConfig.from_currency.symbol
          : pairForBinanceConfig.to_currency.symbol;

      const isValid = await validateTradeMethodsWithBinance(
        fiatCurrency,
        binanceConfig.banks_to_track
      );
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

  // Helper functions
  const getFiatCurrencyFromPair = (
    fromCurrencyUuid: string,
    toCurrencyUuid: string
  ): string | null => {
    const fromCurrency = currencies.find((c) => c.uuid === fromCurrencyUuid);
    const toCurrency = currencies.find((c) => c.uuid === toCurrencyUuid);

    if (fromCurrency?.currency_type === "FIAT") {
      return fromCurrency.symbol;
    } else if (toCurrency?.currency_type === "FIAT") {
      return toCurrency.symbol;
    }

    return null;
  };

  const getPairTypeLabel = (
    pairType: PairType
  ): { label: string; color: string; icon: string } => {
    // Normalizar el valor a mayúsculas para comparación
    const normalizedType = (pairType as string).toUpperCase();

    switch (normalizedType) {
      case "BASE":
        return {
          label: "Base",
          color: "bg-green-100 text-green-800",
          icon: "🏗",
        };
      case "DERIVED":
        return {
          label: "Derivado",
          color: "bg-blue-100 text-blue-800",
          icon: "🔗",
        };
      case "CROSS":
        return {
          label: "Cruzado",
          color: "bg-purple-100 text-purple-800",
          icon: "🔀",
        };
      default:
        console.warn("Tipo de par desconocido:", pairType);
        return {
          label: "Desconocido",
          color: "bg-gray-100 text-gray-800",
          icon: "❓",
        };
    }
  };

  // Validate trade methods against Binance API
  const validateTradeMethodsWithBinance = async (
    fiatCurrency: string,
    selectedMethods: string[]
  ): Promise<boolean> => {
    try {
      const result = await adminService.getBinanceTradeMethodsByUrl(
        fiatCurrency
      );
      if (result.success && result.data) {
        const validMethods = result.data.map((method) => method.identifier);
        const invalidMethods = selectedMethods.filter(
          (method) => !validMethods.includes(method)
        );

        if (invalidMethods.length > 0) {
          setError(
            `Métodos de pago inválidos para ${fiatCurrency}: ${invalidMethods.join(
              ", "
            )}`
          );
          return false;
        }
        return true;
      } else {
        // If we can't fetch from Binance, allow the form to proceed with a warning
        console.warn(
          "Could not validate trade methods with Binance:",
          result.error
        );
        return true;
      }
    } catch (err) {
      console.error("Error validating trade methods:", err);
      return true; // Allow to proceed if validation fails
    }
  };

  const validateBinanceForm = async (
    formData: CreateCurrencyPairData | UpdateCurrencyPairData
  ): Promise<boolean> => {
    setError("");

    if (formData.binance_tracked) {
      // Validar tipos de moneda solo si tenemos from_currency_uuid y to_currency_uuid (CreateCurrencyPairData)
      if ("from_currency_uuid" in formData && "to_currency_uuid" in formData) {
        const fromCurrency = currencies.find(
          (c) => c.uuid === formData.from_currency_uuid
        );
        const toCurrency = currencies.find(
          (c) => c.uuid === formData.to_currency_uuid
        );

        const validTypes =
          (fromCurrency?.currency_type === "FIAT" &&
            toCurrency?.currency_type === "CRYPTO") ||
          (fromCurrency?.currency_type === "CRYPTO" &&
            toCurrency?.currency_type === "FIAT");

        if (!validTypes) {
          setError(
            "Los pares de Binance deben ser entre monedas FIAT y CRYPTO"
          );
          return false;
        }
      }

      // Validar campos requeridos
      if (!formData.banks_to_track?.length) {
        setError("Debe seleccionar al menos un método de pago");
        return false;
      }

      if (!formData.amount_to_track || formData.amount_to_track <= 0) {
        setError("El monto debe ser mayor a 0");
        return false;
      }

      // Validate against Binance API
      let fiatCurrency: string | null = null;
      if ("from_currency_uuid" in formData && "to_currency_uuid" in formData) {
        fiatCurrency = getFiatCurrencyFromPair(
          formData.from_currency_uuid,
          formData.to_currency_uuid
        );
      }

      if (fiatCurrency) {
        const isValid = await validateTradeMethodsWithBinance(
          fiatCurrency,
          formData.banks_to_track
        );
        if (!isValid) {
          return false;
        }
      }
    }

    return true;
  };

  const handleShowHistory = (pair: CurrencyPairData) => {
    setSelectedPairForHistory(pair);
    setShowHistoryModal(true);
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedPairForHistory(null);
  };

  const handleOpenManualRateDialog = async (pair: CurrencyPairData) => {
    setSelectedPairForManualRate(pair);
    setSelectedPairRateInfo({ isManual: false });
    setShowManualRateDialog(true);

    const result = await ratesService.getRateByPair(pair.uuid);
    if (result.success && result.data) {
      setSelectedPairRateInfo({
        isManual: result.data.is_manual,
        currentRate: result.data.manual_rate ?? result.data.rate,
        automaticRate: result.data.automatic_rate ?? undefined,
      });
    }
  };

  const handleCloseManualRateDialog = () => {
    setShowManualRateDialog(false);
    setSelectedPairForManualRate(null);
    setSelectedPairRateInfo({ isManual: false });
  };

  const handleSetManualRate = async (rate: number): Promise<boolean> => {
    if (!selectedPairForManualRate) return false;

    setManualRateLoading(true);
    try {
      const result = await adminService.setManualRate(
        selectedPairForManualRate.uuid,
        rate
      );

      if (result.success) {
        return true;
      } else {
        alert(result.error || "Error al establecer precio manual");
        return false;
      }
    } catch {
      alert("Error de conexión al servidor");
      return false;
    } finally {
      setManualRateLoading(false);
    }
  };

  const handleRemoveManualRate = async () => {
    if (!selectedPairForManualRate) return;

    setManualRateLoading(true);
    try {
      const result = await adminService.disableManualRate(
        selectedPairForManualRate.uuid
      );

      if (result.success) {
        setSelectedPairRateInfo({ isManual: false });
        handleCloseManualRateDialog();
      } else {
        alert(result.error || "Error al remover precio manual");
      }
    } catch {
      alert("Error de conexión al servidor");
    } finally {
      setManualRateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Cargando pares de monedas...
            </h3>
            <p className="text-gray-500">
              Por favor espera mientras obtenemos la información.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Gestión de Pares de Monedas
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus size={16} />
            Nuevo Par
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <TrendingUp className="text-blue-500 mr-2" size={18} />
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Total Pares
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.total_pairs}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <ToggleRight className="text-green-500 mr-2" size={18} />
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Pares Activos
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.active_pairs}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
              <div className="flex items-center">
                <Eye className="text-purple-500 mr-2" size={18} />
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Monitoreados
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.monitored_pairs}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 flex-wrap">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={filters.activeOnly}
              onChange={(e) =>
                setFilters({ ...filters, activeOnly: e.target.checked })
              }
              className="mr-2"
            />
            Solo activos
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={filters.monitoredOnly}
              onChange={(e) =>
                setFilters({ ...filters, monitoredOnly: e.target.checked })
              }
              className="mr-2"
            />
            Solo monitoreados
          </label>
          <select
            value={filters.currency}
            onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="">Todas las monedas</option>
            {Array.from(new Set(currencies.map(c => c.symbol))).sort().map(sym => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Currency Pairs List */}
      <div className="space-y-4">
        {pairs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  {filters.activeOnly || filters.monitoredOnly || !!filters.currency ? (
                    <Eye className="text-gray-400" size={32} />
                  ) : (
                    <ArrowLeftRight className="text-gray-400" size={32} />
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filters.activeOnly || filters.monitoredOnly || !!filters.currency
                    ? "No se encontraron pares con estos filtros"
                    : "No hay pares de monedas"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {filters.activeOnly || filters.monitoredOnly || !!filters.currency
                    ? "Prueba ajustando los filtros o crea un nuevo par de monedas."
                    : "Comienza creando tu primer par de monedas para gestionar las tasas de cambio."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {(filters.activeOnly || filters.monitoredOnly || !!filters.currency) && (
                    <button
                      onClick={() =>
                        setFilters({ activeOnly: false, monitoredOnly: false, currency: '' })
                      }
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center sm:justify-start gap-2"
                    >
                      <X size={16} />
                      Limpiar filtros
                    </button>
                  )}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center sm:justify-start gap-2"
                  >
                    <Plus size={16} />
                    {filters.activeOnly || filters.monitoredOnly || !!filters.currency
                      ? "Crear nuevo par"
                      : "Crear primer par"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          pairs.map((pair) => (
            <div
              key={pair.uuid}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              {/* Mobile Layout */}
              <div className="block lg:hidden">
                <div className="p-4 sm:p-6">
                  {/* Header Section */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {pair.from_currency.symbol.charAt(0)}
                        {pair.to_currency.symbol.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-base">
                          {pair.display_name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            getPairTypeLabel(pair.pair_type).color
                          }`}
                        >
                          {getPairTypeLabel(pair.pair_type).icon}{" "}
                          {getPairTypeLabel(pair.pair_type).label}
                        </span>
                        {pair.usdt_reference_side && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            USDT ✓
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">
                          {pair.from_currency.name}
                        </span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-medium">
                          {pair.to_currency.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {pair.description}
                    </p>

                    {/* Base Pair Relationship Info */}
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-xs text-blue-700">
                        {pair.base_pair && (
                          <div>
                            <span className="font-medium">Par base:</span>{" "}
                            {pair.base_pair.display_name}
                          </div>
                        )}
                        {pair.derived_percentage && (
                          <div>
                            <span className="font-medium">Porcentaje:</span>{" "}
                            {pair.derived_percentage}%{" "}
                            {pair.use_inverse_percentage ? "(inverso)" : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Binance Configuration */}
                  {pair.binance_tracked &&
                    pair.banks_to_track &&
                    pair.amount_to_track && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Bitcoin className="text-amber-600" size={16} />
                          <span className="font-medium text-amber-800 text-sm">
                            Configuración Binance P2P
                          </span>
                        </div>
                        <div className="text-xs text-amber-700 space-y-1">
                          <div>
                            <span className="font-medium">Métodos:</span>{" "}
                            {pair.banks_to_track.join(", ")}
                          </div>
                          <div>
                            <span className="font-medium">Monto:</span> $
                            {pair.amount_to_track}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Action Bar */}
                  <div className="border-t border-gray-100 pt-4">
                    {/* Status Toggles Row */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="flex items-center bg-gray-50 rounded-xl p-1">
                        {/* Active Toggle */}
                        <button
                          onClick={() => handleToggleActive(pair)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            pair.is_active
                              ? "bg-green-500 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          title={
                            pair.is_active ? "Desactivar par" : "Activar par"
                          }
                        >
                          {pair.is_active ? (
                            <ToggleRight size={16} />
                          ) : (
                            <ToggleLeft size={16} />
                          )}
                          <span className="hidden sm:inline">
                            {pair.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </button>

                        {/* Monitor Toggle */}
                        <button
                          onClick={() => handleToggleMonitored(pair)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            pair.is_monitored
                              ? "bg-purple-500 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          title={
                            pair.is_monitored
                              ? "Dejar de monitorear"
                              : "Iniciar monitoreo"
                          }
                        >
                          {pair.is_monitored ? (
                            <Eye size={16} />
                          ) : (
                            <EyeOff size={16} />
                          )}
                          <span className="hidden sm:inline">Monitor</span>
                        </button>

                        {/* Binance Toggle */}
                        <button
                          onClick={() => handleToggleBinanceTracked(pair)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            pair.binance_tracked
                              ? "bg-orange-500 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          title={
                            pair.binance_tracked
                              ? "Desactivar Binance P2P"
                              : "Activar Binance P2P"
                          }
                        >
                          <Bitcoin size={16} />
                          <span className="hidden sm:inline">Binance</span>
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() =>
                          (window.location.href = `/admin/currency-pairs/${
                            pair.uuid || `pair-${pair.uuid}`
                          }/configs`)
                        }
                        className="flex flex-col items-center justify-center p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-700 hover:text-amber-800 transition-all duration-200 group"
                        title="Configuraciones de comisión"
                      >
                        <DollarSign
                          size={20}
                          className="mb-1 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-xs font-medium">Comisiones</span>
                      </button>

                      <button
                        onClick={() => handleOpenManualRateDialog(pair)}
                        className="flex flex-col items-center justify-center p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-purple-700 hover:text-purple-800 transition-all duration-200 group"
                        title="Gestionar precio manual"
                      >
                        <Settings
                          size={20}
                          className="mb-1 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-xs font-medium">Precio</span>
                      </button>

                      <button
                        onClick={() => handleShowHistory(pair)}
                        className="flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-700 hover:text-green-800 transition-all duration-200 group"
                        title="Ver historial de tasas"
                      >
                        <History
                          size={20}
                          className="mb-1 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-xs font-medium">Historial</span>
                      </button>

                      <button
                        onClick={() => setEditingPair(pair)}
                        className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 hover:text-blue-800 transition-all duration-200 group"
                        title="Editar par"
                      >
                        <Edit
                          size={20}
                          className="mb-1 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-xs font-medium">Editar</span>
                      </button>

                      <button
                        onClick={() => handleDelete(pair.uuid)}
                        className="flex flex-col items-center justify-center p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 hover:text-red-800 transition-all duration-200 group"
                        title="Eliminar par"
                      >
                        <Trash2
                          size={20}
                          className="mb-1 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-xs font-medium">Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:block">
                <div className="p-6">
                  <div className="flex items-start gap-6">
                    {/* Left Section - Currency Info */}
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {pair.from_currency.symbol.charAt(0)}
                          {pair.to_currency.symbol.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {pair.display_name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              getPairTypeLabel(pair.pair_type).color
                            }`}
                          >
                            {getPairTypeLabel(pair.pair_type).icon}{" "}
                            {getPairTypeLabel(pair.pair_type).label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">
                            {pair.from_currency.name}
                          </span>
                          <span className="mx-3 text-gray-400">→</span>
                          <span className="font-medium">
                            {pair.to_currency.name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {pair.description}
                        </p>

                        {/* Base Pair Relationship Info */}
                        <div className="mt-2 flex items-center gap-4 text-xs text-blue-600">
                          {pair.base_pair && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Par base:</span>
                              <span>{pair.base_pair.display_name}</span>
                            </div>
                          )}
                          {pair.derived_percentage && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Porcentaje:</span>
                              <span>
                                {pair.derived_percentage}%{" "}
                                {pair.use_inverse_percentage ? "(inverso)" : ""}
                              </span>
                            </div>
                          )}
                        </div>

                        {pair.binance_tracked &&
                          pair.banks_to_track &&
                          pair.amount_to_track && (
                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Métodos:</span>
                                <span>{pair.banks_to_track.join(", ")}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Monto:</span>
                                <span>${pair.amount_to_track}</span>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Right Section - Controls */}
                    <div className="flex-shrink-0 flex flex-col gap-4">
                      {/* Status Controls */}
                      <div className="flex items-center bg-gray-50 rounded-xl p-1">
                        <button
                          onClick={() => handleToggleActive(pair)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            pair.is_active
                              ? "bg-green-500 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          title={
                            pair.is_active ? "Desactivar par" : "Activar par"
                          }
                        >
                          {pair.is_active ? (
                            <ToggleRight size={18} />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                          <span>{pair.is_active ? "Activo" : "Inactivo"}</span>
                        </button>

                        <button
                          onClick={() => handleToggleMonitored(pair)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            pair.is_monitored
                              ? "bg-purple-500 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          title={
                            pair.is_monitored
                              ? "Dejar de monitorear"
                              : "Iniciar monitoreo"
                          }
                        >
                          {pair.is_monitored ? (
                            <Eye size={18} />
                          ) : (
                            <EyeOff size={18} />
                          )}
                          <span>Monitor</span>
                        </button>

                        <button
                          onClick={() => handleToggleBinanceTracked(pair)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            pair.binance_tracked
                              ? "bg-orange-500 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          title={
                            pair.binance_tracked
                              ? "Desactivar Binance P2P"
                              : "Activar Binance P2P"
                          }
                        >
                          <Bitcoin size={18} />
                          <span>Binance</span>
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() =>
                            (window.location.href = `/admin/currency-pairs/${
                              pair.uuid || `pair-${pair.uuid}`
                            }/configs`)
                          }
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-700 hover:text-amber-800 transition-all duration-200 group"
                          title="Configuraciones de comisión"
                        >
                          <DollarSign
                            size={16}
                            className="group-hover:scale-110 transition-transform"
                          />
                          <span className="text-sm font-medium">
                            Comisiones
                          </span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleOpenManualRateDialog(pair)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-purple-700 hover:text-purple-800 transition-all duration-200 group"
                            title="Gestionar precio manual"
                          >
                            <Settings
                              size={16}
                              className="group-hover:scale-110 transition-transform"
                            />
                            <span className="text-sm font-medium">Precio</span>
                          </button>

                          <button
                            onClick={() => handleShowHistory(pair)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-700 hover:text-green-800 transition-all duration-200 group"
                            title="Ver historial de tasas"
                          >
                            <History
                              size={16}
                              className="group-hover:scale-110 transition-transform"
                            />
                            <span className="text-sm font-medium">
                              Historial
                            </span>
                          </button>

                          <button
                            onClick={() => setEditingPair(pair)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 hover:text-blue-800 transition-all duration-200 group"
                            title="Editar par"
                          >
                            <Edit
                              size={16}
                              className="group-hover:scale-110 transition-transform"
                            />
                            <span className="text-sm font-medium">Editar</span>
                          </button>

                          <button
                            onClick={() => handleDelete(pair.uuid)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 hover:text-red-800 transition-all duration-200 group"
                            title="Eliminar par"
                          >
                            <Trash2
                              size={16}
                              className="group-hover:scale-110 transition-transform"
                            />
                            <span className="text-sm font-medium">
                              Eliminar
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      <CreateCurrencyPairModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        currencies={currencies}
        basePairs={basePairs}
        error={error}
        setError={setError}
        validateBinanceForm={validateBinanceForm}
        getFiatCurrencyFromPair={getFiatCurrencyFromPair}
      />

      {/* Edit Modal */}
      <EditCurrencyPairModal
        isOpen={!!editingPair}
        onClose={() => setEditingPair(null)}
        onSubmit={handleUpdate}
        editingPair={editingPair}
        basePairs={basePairs}
        error={error}
        setError={setError}
        validateBinanceForm={validateBinanceForm}
        getFiatCurrencyFromPair={getFiatCurrencyFromPair}
      />

      {/* Binance Configuration Modal */}
      {showBinanceModal && pairForBinanceConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                  {pairForBinanceConfig.from_currency.name} (
                  {pairForBinanceConfig.from_currency.currency_type}) →{" "}
                  {pairForBinanceConfig.to_currency.name} (
                  {pairForBinanceConfig.to_currency.currency_type})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Métodos de Pago de Binance{" "}
                  <span className="text-red-500">*</span>
                </label>
                {pairForBinanceConfig && (
                  <TradeMethodSelector
                    selectedMethods={binanceConfig.banks_to_track}
                    onChange={(methods) =>
                      setBinanceConfig({
                        ...binanceConfig,
                        banks_to_track: methods,
                      })
                    }
                    fiatCurrency={
                      pairForBinanceConfig.from_currency.currency_type ===
                      "FIAT"
                        ? pairForBinanceConfig.from_currency.symbol
                        : pairForBinanceConfig.to_currency.symbol
                    }
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
                  value={binanceConfig.amount_to_track || ""}
                  onChange={(e) =>
                    setBinanceConfig({
                      ...binanceConfig,
                      amount_to_track: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="100.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Monto en{" "}
                  {pairForBinanceConfig.from_currency.currency_type === "CRYPTO"
                    ? pairForBinanceConfig.from_currency.symbol
                    : pairForBinanceConfig.to_currency.symbol}{" "}
                  para buscar órdenes
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
          selectedPair={selectedPairForHistory}
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
          currentRate={selectedPairRateInfo.currentRate}
          automaticRate={selectedPairRateInfo.automaticRate}
          isManual={selectedPairRateInfo.isManual}
          isLoading={manualRateLoading}
        />
      )}
    </div>
  );
}
