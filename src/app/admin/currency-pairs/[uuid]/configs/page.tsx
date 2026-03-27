"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AdminService } from '@/services/adminService';
import { commissionConfigService } from '@/services/commissionConfigService';
import { userService } from '@/services/userService';
import { fundService } from '@/services/fundService';
import { CurrencyPairData } from '@/types/admin';
import {
  CommissionConfiguration,
  CommissionConfigCreate
} from '@/types/commissionConfig';
import { CommissionUserResponse } from '@/types/user';
import { FundGroup } from '@/types/fund';
import { ArrowLeft, Plus, Trash2, Users, DollarSign, Percent } from 'lucide-react';
import Link from 'next/link';

const adminService = new AdminService();

export default function PairCommissionConfigsPage() {
  const params = useParams();
  const pairUuid = params.uuid as string;

  const [pair, setPair] = useState<CurrencyPairData | null>(null);
  const [configurations, setConfigurations] = useState<CommissionConfiguration[]>([]);
  const [commissionUsers, setCommissionUsers] = useState<CommissionUserResponse[]>([]);
  const [fundGroups, setFundGroups] = useState<FundGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState<CommissionConfigCreate>({
    currency_pair_uuid: '',
    name: '',
    description: '',
    total_percentage: 10,
    fund_group_uuid: null,
    splits: []
  });

  const [splitInput, setSplitInput] = useState({
    user_uuid: '',
    percentage: 0
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Load pair data
      const pairResult = await adminService.getCurrencyPairs(0, 1000);
      if (pairResult.success && pairResult.data) {
        const foundPair = pairResult.data.pairs.find(p => p.uuid === pairUuid || `pair-${p.uuid}` === pairUuid);
        if (foundPair) {
          setPair(foundPair);
          // Use uuid if available, otherwise fallback to id converted to string
          const resolvedUuid = foundPair.uuid || `pair-${foundPair.uuid}`;
          setFormData(prev => ({ ...prev, currency_pair_uuid: resolvedUuid }));

          // Load configurations for this pair
          await loadConfigurations(resolvedUuid);
        }
      }

      // Load commission users
      const usersResult = await userService.getAvailableCommissionUsers();
      if (usersResult.success && usersResult.data) {
        setCommissionUsers(usersResult.data);
      }

      // Load fund groups
      const groupsResult = await fundService.getGroups();
      if (groupsResult.success && groupsResult.data) {
        setFundGroups(groupsResult.data.filter(g => g.is_active));
      }

      setLoading(false);
    };

    loadData();
  }, [pairUuid]);

  const loadConfigurations = async (currencyPairUuid: string) => {
    const result = await commissionConfigService.getConfigsByPair(currencyPairUuid, false);
    if (result.success && result.data) {
      setConfigurations(result.data.configurations);
    }
  };

  const handleAddSplit = () => {
    if (!splitInput.user_uuid) {
      alert('Por favor selecciona un usuario');
      return;
    }

    if (splitInput.percentage <= 0) {
      alert('El porcentaje debe ser mayor a 0');
      return;
    }

    const totalCurrent = formData.splits.reduce((sum, s) => sum + s.percentage, 0);
    if (totalCurrent + splitInput.percentage > formData.total_percentage) {
      alert(`La suma de los porcentajes no puede exceder ${formData.total_percentage}%`);
      return;
    }

    // Check if user already exists
    if (formData.splits.some(s => s.user_uuid === splitInput.user_uuid)) {
      alert('Este usuario ya está en la lista');
      return;
    }

    setFormData({
      ...formData,
      splits: [...formData.splits, { ...splitInput }]
    });

    setSplitInput({ user_uuid: '', percentage: 0 });
  };

  const handleRemoveSplit = (index: number) => {
    setFormData({
      ...formData,
      splits: formData.splits.filter((_, i) => i !== index)
    });
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.splits.length === 0) {
      alert('Debe agregar al menos un usuario con su porcentaje');
      return;
    }

    const totalSplit = formData.splits.reduce((sum, s) => sum + s.percentage, 0);
    if (totalSplit !== formData.total_percentage) {
      alert(`La suma de los porcentajes debe ser igual a ${formData.total_percentage}%`);
      return;
    }

    const result = await commissionConfigService.createConfig(formData);
    if (result.success) {
      setShowCreateForm(false);
      setFormData({
        currency_pair_uuid: pair?.uuid || '',
        name: '',
        description: '',
        total_percentage: 10,
        fund_group_uuid: null,
        splits: []
      });
      if (pair?.uuid) {
        await loadConfigurations(pair.uuid);
      }
    } else {
      alert(result.error || 'Error al crear configuración');
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('¿Estás seguro de que quieres desactivar esta configuración?')) {
      return;
    }

    const result = await commissionConfigService.deleteConfig(configId, true);
    if (result.success) {
      if (pair?.uuid) {
        await loadConfigurations(pair.uuid);
      }
    } else {
      alert(result.error || 'Error al eliminar configuración');
    }
  };

  const handleToggleActive = async (config: CommissionConfiguration) => {
    const result = await commissionConfigService.updateConfig(config.uuid, {
      is_active: !config.is_active
    });

    if (result.success) {
      if (pair?.uuid) {
        await loadConfigurations(pair.uuid);
      }
    } else {
      alert(result.error || 'Error al actualizar configuración');
    }
  };

  const getUserDisplayName = (userUuid: string) => {
    const user = commissionUsers.find(u => u.uuid === userUuid);
    if (!user) return `Usuario ${userUuid}`;
    return user.full_name || user.username;
  };

  const getTotalSplitPercentage = () => {
    return formData.splits.reduce((sum, s) => sum + s.percentage, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pair) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Par de monedas no encontrado
        </div>
        <Link href="/admin/currency-pairs" className="text-blue-600 hover:underline mt-4 inline-block">
          Volver a Pares de Monedas
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/currency-pairs"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={16} />
          Volver a Pares de Monedas
        </Link>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Configuraciones de Comisión
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Par: <span className="font-semibold">{pair.display_name}</span> ({pair.pair_symbol})
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Nueva Configuración
          </button>
        </div>

        {/* Pair Info */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Monedas</p>
              <p className="font-semibold text-gray-900">
                {pair.from_currency.symbol} → {pair.to_currency.symbol}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tipo</p>
              <p className="font-semibold text-gray-900">{pair.pair_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Descripción</p>
              <p className="font-semibold text-gray-900">{pair.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Nueva Configuración de Comisión
          </h2>

          <form onSubmit={handleCreateConfig}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Ej: Configuración Estándar"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porcentaje Total (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.total_percentage}
                  onChange={(e) => setFormData({ ...formData, total_percentage: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
                  placeholder="Ej: División equitativa 50/50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grupo de Fondos (Opcional)
                </label>
                <select
                  value={formData.fund_group_uuid || ''}
                  onChange={(e) => setFormData({ ...formData, fund_group_uuid: e.target.value || null })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Sin grupo de fondos</option>
                  {fundGroups.map((g) => (
                    <option key={g.uuid} value={g.uuid}>{g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Si se selecciona, las transacciones con esta config crearán automáticamente un movimiento en el fondo.
                </p>
              </div>
            </div>

            {/* Add Split Section */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users size={16} />
                Distribución de Comisión
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario Comisionista
                  </label>
                  <select
                    value={splitInput.user_uuid}
                    onChange={(e) => setSplitInput({ ...splitInput, user_uuid: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Seleccionar usuario...</option>
                    {commissionUsers.map((user) => (
                      <option key={user.uuid} value={user.uuid}>
                        {user.full_name || user.username} - {user.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Porcentaje (%)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={splitInput.percentage || ''}
                      onChange={(e) => setSplitInput({ ...splitInput, percentage: parseFloat(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="5.00"
                    />
                    <button
                      type="button"
                      onClick={handleAddSplit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Splits */}
              {formData.splits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-700">Distribución Actual:</p>
                    <p className="text-sm text-gray-600">
                      Total: {getTotalSplitPercentage().toFixed(2)}% de {formData.total_percentage}%
                    </p>
                  </div>

                  {formData.splits.map((split, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">
                            {getUserDisplayName(split.user_uuid).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {getUserDisplayName(split.user_uuid)}
                          </p>
                          <p className="text-xs text-blue-700">
                            {split.percentage}%
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSplit(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {getTotalSplitPercentage() > 0 && getTotalSplitPercentage() < formData.total_percentage && (
                <p className="text-sm text-amber-600 mt-2">
                  ⚠️ Falta asignar {(formData.total_percentage - getTotalSplitPercentage()).toFixed(2)}%
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear Configuración
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Configurations List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign size={20} />
          Configuraciones Existentes ({configurations.length})
        </h2>

        {configurations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay configuraciones
              </h3>
              <p className="text-gray-500 mb-4">
                Crea tu primera configuración de comisión para este par
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={16} />
                Nueva Configuración
              </button>
            </div>
          </div>
        ) : (
          configurations.map((config) => (
            <div
              key={config.uuid}
              className={`bg-white rounded-lg border-2 p-6 ${
                config.is_active ? 'border-green-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {config.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        config.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {config.is_active ? '✓ Activa' : '✗ Inactiva'}
                    </span>
                  </div>
                  {config.description && (
                    <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Percent size={16} />
                      <span className="font-semibold">
                        Total: {config.total_percentage}%
                      </span>
                    </div>
                    {config.fund_group_name && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Fondo: {config.fund_group_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(config)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      config.is_active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {config.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDeleteConfig(config.uuid)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    title="Eliminar configuración"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Splits */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Distribución de Comisión:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {config.splits.map((split, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {(split.username || `U`).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {split.user_full_name || split.username || `Usuario`}
                          </p>
                          <p className="text-xs text-blue-700">{split.user_uuid}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-900">
                          {split.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
