"use client";

import { useState, useEffect, useCallback } from 'react';
import { fundService } from '@/services/fundService';
import { userService } from '@/services/userService';
import { adminService } from '@/services/adminService';
import { CurrencyData } from '@/types/admin';
import {
  FundGroup,
  FundMovement,
  GroupBalance,
  FundMovementFilters,
  CreateFundGroup,
  AddFundMember,
  CreateFundMovement,
  MovementType,
} from '@/types/fund';
import { CommissionUserResponse } from '@/types/user';
import { Wallet, Plus, Trash2, Filter, Users, TrendingUp, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/utils/enums';

const MOVEMENT_LABELS: Record<MovementType, string> = {
  [MovementType.DEPOSIT]: 'Depósito',
  [MovementType.EXCHANGE]: 'Cambio',
  [MovementType.PERSONAL]: 'Personal',
  [MovementType.ADJUSTMENT]: 'Ajuste',
};

const MOVEMENT_COLORS: Record<MovementType, string> = {
  [MovementType.DEPOSIT]: 'bg-green-100 text-green-800',
  [MovementType.EXCHANGE]: 'bg-blue-100 text-blue-800',
  [MovementType.PERSONAL]: 'bg-orange-100 text-orange-800',
  [MovementType.ADJUSTMENT]: 'bg-gray-100 text-gray-800',
};

export default function FundsPage() {
  const { user } = useAuth();
  const isModeratorOrAbove = user?.role === Role.MODERATOR || user?.role === Role.ROOT;
  const isRoot = user?.role === Role.ROOT;

  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [selectedGroupUuid, setSelectedGroupUuid] = useState<string>('');
  const [groupBalance, setGroupBalance] = useState<GroupBalance | null>(null);
  const [movements, setMovements] = useState<FundMovement[]>([]);
  const [availableUsers, setAvailableUsers] = useState<CommissionUserResponse[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyData[]>([]);

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const MOVEMENTS_PER_PAGE = 50;

  const [movementFilters, setMovementFilters] = useState<FundMovementFilters>({});

  // Modal states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRegisterMovement, setShowRegisterMovement] = useState(false);

  // Form states
  const [createGroupForm, setCreateGroupForm] = useState<CreateFundGroup>({ name: '', currency: '', description: '' });
  const [addMemberForm, setAddMemberForm] = useState<AddFundMember>({ user_uuid: '', is_fund_manager: false });
  const [movementForm, setMovementForm] = useState<Omit<CreateFundMovement, 'group_uuid'>>({
    user_uuid: '',
    movement_type: MovementType.DEPOSIT,
    amount: 0,
    currency: 'USD',
    amount_usdt: 0,
    usdt_rate: 1,
    movement_date: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Load groups on mount
  useEffect(() => {
    const loadGroups = async () => {
      setLoadingGroups(true);
      const result = await fundService.getGroups();
      if (result.success && result.data) {
        setGroups(result.data);
        if (result.data.length > 0) {
          setSelectedGroupUuid(result.data[0].uuid);
        }
      }
      setLoadingGroups(false);
    };

    const loadUsers = async () => {
      const result = await userService.getAvailableCommissionUsers();
      if (result.success && result.data) {
        setAvailableUsers(result.data);
      }
    };

    const loadCurrencies = async () => {
      const result = await adminService.getCurrencies(1, 100);
      if (result.success && result.data) {
        setAvailableCurrencies(result.data.currencies);
      }
    };

    loadGroups();
    loadUsers();
    loadCurrencies();
  }, []);

  // Load balance and movements when selected group changes
  const loadGroupData = useCallback(async () => {
    if (!selectedGroupUuid) return;

    setLoadingBalance(true);
    setLoadingMovements(true);

    const [balanceResult, movementsResult] = await Promise.all([
      fundService.getGroupBalance(selectedGroupUuid),
      fundService.getGroupMovements(selectedGroupUuid, {
        ...movementFilters,
        page: movementsPage,
        per_page: MOVEMENTS_PER_PAGE,
      }),
    ]);

    if (balanceResult.success && balanceResult.data) {
      setGroupBalance(balanceResult.data);
    }
    setLoadingBalance(false);

    if (movementsResult.success && movementsResult.data) {
      setMovements(movementsResult.data.movements);
      setMovementsTotal(movementsResult.data.total);
    }
    setLoadingMovements(false);
  }, [selectedGroupUuid, movementFilters, movementsPage]);

  useEffect(() => {
    setMovementsPage(1);
  }, [selectedGroupUuid, movementFilters]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  const formatUSDT = (value: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });

  const getUserDisplayName = (uuid: string) => {
    const u = availableUsers.find(u => u.uuid === uuid);
    return u ? u.full_name || u.username : uuid;
  };

  // --- Create Group ---
  const handleCreateGroup = async () => {
    setFormError('');
    if (!createGroupForm.name.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (!createGroupForm.currency) {
      setFormError('La moneda es obligatoria');
      return;
    }
    setFormLoading(true);
    const result = await fundService.createGroup(createGroupForm);
    if (result.success && result.data) {
      setGroups(prev => [...prev, result.data!]);
      setSelectedGroupUuid(result.data.uuid);
      setShowCreateGroup(false);
      setCreateGroupForm({ name: '', currency: '', description: '' });
    } else {
      setFormError(result.error || 'Error al crear grupo');
    }
    setFormLoading(false);
  };

  // --- Add Member ---
  const handleAddMember = async () => {
    setFormError('');
    if (!addMemberForm.user_uuid) {
      setFormError('Selecciona un usuario');
      return;
    }
    setFormLoading(true);
    const result = await fundService.addMember(selectedGroupUuid, addMemberForm);
    if (result.success) {
      setShowAddMember(false);
      setAddMemberForm({ user_uuid: '', is_fund_manager: false });
      loadGroupData();
    } else {
      setFormError(result.error || 'Error al agregar miembro');
    }
    setFormLoading(false);
  };

  // --- Register Movement ---
  const handleRegisterMovement = async () => {
    setFormError('');
    if (!movementForm.user_uuid) {
      setFormError('Selecciona un gestor');
      return;
    }
    if (movementForm.amount <= 0) {
      setFormError('El monto debe ser mayor a 0');
      return;
    }
    setFormLoading(true);
    const result = await fundService.createMovement({
      ...movementForm,
      group_uuid: selectedGroupUuid,
    });
    if (result.success) {
      setShowRegisterMovement(false);
      setMovementForm({
        user_uuid: '',
        movement_type: MovementType.DEPOSIT,
        amount: 0,
        currency: 'USD',
        amount_usdt: 0,
        usdt_rate: 1,
        movement_date: new Date().toISOString().slice(0, 16),
        notes: '',
      });
      loadGroupData();
    } else {
      setFormError(result.error || 'Error al registrar movimiento');
    }
    setFormLoading(false);
  };

  // --- Delete Movement ---
  const handleDeleteMovement = async (uuid: string) => {
    if (!confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return;
    const result = await fundService.deleteMovement(uuid);
    if (result.success) {
      loadGroupData();
    } else {
      alert(result.error || 'Error al eliminar movimiento');
    }
  };

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet size={28} />
            Fondos
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Gestión de posiciones y movimientos de fondos físicos
          </p>
        </div>

        {isModeratorOrAbove && (
          <div className="flex gap-2">
            <button
              onClick={() => { setFormError(''); setShowCreateGroup(true); }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <Plus size={16} />
              Nuevo Grupo
            </button>
            {selectedGroupUuid && (
              <>
                <button
                  onClick={() => { setFormError(''); setShowAddMember(true); }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Users size={16} />
                  Agregar Miembro
                </button>
                <button
                  onClick={() => { setFormError(''); setShowRegisterMovement(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus size={16} />
                  Registrar Movimiento
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Group Selector */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Wallet className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay grupos de fondos</h3>
          {isModeratorOrAbove && (
            <p className="text-gray-600">Crea el primer grupo con el botón &quot;Nuevo Grupo&quot;</p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Grupo</label>
            <select
              value={selectedGroupUuid}
              onChange={(e) => setSelectedGroupUuid(e.target.value)}
              className="w-full sm:w-72 border border-gray-300 rounded-md px-3 py-2"
            >
              {groups.map((g) => (
                <option key={g.uuid} value={g.uuid}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Balance Cards */}
          {loadingBalance ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          ) : groupBalance && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-600 rounded-full p-2">
                    <DollarSign className="text-white" size={18} />
                  </div>
                  <p className="text-sm font-medium text-blue-700">Total Posición</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatUSDT(groupBalance.total_position_usdt)} USDT
                </p>
                <p className="text-xs text-blue-600 mt-1">Depósitos − Salidas</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-600 rounded-full p-2">
                    <TrendingUp className="text-white" size={18} />
                  </div>
                  <p className="text-sm font-medium text-green-700">Ganancias Acumuladas</p>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {formatUSDT(groupBalance.total_profit_usdt)} USDT
                </p>
                <p className="text-xs text-green-600 mt-1">De transacciones completadas</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-600 rounded-full p-2">
                    <Wallet className="text-white" size={18} />
                  </div>
                  <p className="text-sm font-medium text-purple-700">Fondos Disponibles</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {formatUSDT(groupBalance.available_funds_usdt)} USDT
                </p>
                <p className="text-xs text-purple-600 mt-1">Acumuladas − Total Posición</p>
              </div>
            </div>
          )}

          {/* Member Positions */}
          {groupBalance && groupBalance.by_member.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={20} />
                  Posición por Gestor
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gestor</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Depositado (USDT)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Salidas (USDT)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Posición (USDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groupBalance.by_member.map((member) => (
                      <tr key={member.user_uuid} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-semibold text-xs">
                                {(member.full_name || member.username).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {member.full_name || member.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-700">
                          {formatUSDT(member.total_deposited_usdt)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-700">
                          {formatUSDT(member.total_outflow_usdt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-semibold ${member.position_usdt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {member.position_usdt >= 0 ? '+' : ''}{formatUSDT(member.position_usdt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Movement History */}
          {isModeratorOrAbove && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Historial de Movimientos</h2>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={movementFilters.movement_type || ''}
                    onChange={(e) => setMovementFilters(prev => ({
                      ...prev,
                      movement_type: e.target.value ? e.target.value as MovementType : undefined
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="">Todos los tipos</option>
                    {Object.values(MovementType).map(type => (
                      <option key={type} value={type}>{MOVEMENT_LABELS[type]}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={movementFilters.date_from || ''}
                    onChange={(e) => setMovementFilters(prev => ({ ...prev, date_from: e.target.value || undefined }))}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    placeholder="Desde"
                  />
                  <input
                    type="date"
                    value={movementFilters.date_to || ''}
                    onChange={(e) => setMovementFilters(prev => ({ ...prev, date_to: e.target.value || undefined }))}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    placeholder="Hasta"
                  />
                  <button
                    onClick={() => setMovementFilters({})}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                  >
                    <Filter size={14} />
                    Limpiar
                  </button>
                </div>
              </div>

              {loadingMovements ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : movements.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No hay movimientos registrados para este grupo
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gestor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Equiv. USDT</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                        {isRoot && (
                          <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {movements.map((mov) => (
                        <tr key={mov.uuid} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                            {mov.user?.full_name || mov.user?.username || getUserDisplayName(mov.user_uuid)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${MOVEMENT_COLORS[mov.movement_type]}`}>
                              {MOVEMENT_LABELS[mov.movement_type]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-900 whitespace-nowrap">
                            {formatUSDT(mov.amount)} {mov.currency}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-700 whitespace-nowrap">
                            {formatUSDT(mov.amount_usdt)} USDT
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {formatDate(mov.movement_date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {mov.notes || '—'}
                          </td>
                          {isRoot && (
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleDeleteMovement(mov.uuid)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar movimiento"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Movements Pagination */}
              {movementsTotal > MOVEMENTS_PER_PAGE && (
                <div className="flex justify-center items-center gap-2 px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={() => setMovementsPage(p => Math.max(1, p - 1))}
                    disabled={movementsPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {movementsPage} de {Math.ceil(movementsTotal / MOVEMENTS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setMovementsPage(p => p + 1)}
                    disabled={movementsPage >= Math.ceil(movementsTotal / MOVEMENTS_PER_PAGE)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Create Group */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevo Grupo de Fondos</h2>
            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={createGroupForm.name}
                  onChange={(e) => setCreateGroupForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Ej: Zelle/Paypal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
                <select
                  value={createGroupForm.currency}
                  onChange={(e) => setCreateGroupForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Seleccionar moneda...</option>
                  {availableCurrencies.map(c => (
                    <option key={c.uuid} value={c.symbol}>{c.symbol} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={createGroupForm.description}
                  onChange={(e) => setCreateGroupForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading ? 'Creando...' : 'Crear Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Member */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Agregar Miembro al Grupo</h2>
            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                <select
                  value={addMemberForm.user_uuid}
                  onChange={(e) => setAddMemberForm(prev => ({ ...prev, user_uuid: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Seleccionar usuario...</option>
                  {availableUsers.map(u => (
                    <option key={u.uuid} value={u.uuid}>
                      {u.full_name || u.username} — {u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_fund_manager_modal"
                  checked={addMemberForm.is_fund_manager}
                  onChange={(e) => setAddMemberForm(prev => ({ ...prev, is_fund_manager: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_fund_manager_modal" className="text-sm font-medium text-gray-700">
                  Gestor de Fondos
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddMember(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMember}
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading ? 'Agregando...' : 'Agregar Miembro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register Movement */}
      {showRegisterMovement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar Movimiento</h2>
            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gestor *</label>
                <select
                  value={movementForm.user_uuid}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, user_uuid: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Seleccionar gestor...</option>
                  {availableUsers.map(u => (
                    <option key={u.uuid} value={u.uuid}>
                      {u.full_name || u.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimiento *</label>
                <select
                  value={movementForm.movement_type}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, movement_type: e.target.value as MovementType }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {Object.values(MovementType).map(type => (
                    <option key={type} value={type}>{MOVEMENT_LABELS[type]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={movementForm.amount || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      const rate = movementForm.usdt_rate || 1;
                      setMovementForm(prev => ({ ...prev, amount, amount_usdt: amount * rate }));
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select
                    value={movementForm.currency}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="USD">USD</option>
                    <option value="USDT">USDT</option>
                    <option value="COP">COP</option>
                    <option value="VES">VES</option>
                    <option value="BRL">BRL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tasa USDT</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={movementForm.usdt_rate || ''}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 1;
                      setMovementForm(prev => ({ ...prev, usdt_rate: rate, amount_usdt: prev.amount * rate }));
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equiv. USDT</label>
                  <input
                    type="number"
                    step="0.01"
                    value={movementForm.amount_usdt || ''}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, amount_usdt: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  value={movementForm.movement_date}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, movement_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
                  placeholder="Descripción opcional del movimiento..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRegisterMovement(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterMovement}
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
