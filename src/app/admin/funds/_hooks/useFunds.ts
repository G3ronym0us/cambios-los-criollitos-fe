'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { fundService } from '@/services/fundService';
import { userService } from '@/services/userService';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { useConfirm } from '@/hooks/useConfirm';
import { Role } from '@/utils/enums';
import { isUnassignedClientPhone } from '@/utils/functions';
import { CurrencyData } from '@/types/admin';
import { CommissionUserResponse } from '@/types/user';
import { ClientData } from '@/types/client';
import {
  AddFundMember,
  CreateFundGroup,
  CreateFundMovement,
  FundGroup,
  FundGroupMemberFlat,
  FundMovement,
  FundMovementFilters,
  GroupBalance,
  MovementType,
  UpdateFundGroup,
  UpdateFundMember,
} from '@/types/fund';

const MOVEMENTS_PER_PAGE = 50;

const emptyMovementForm: Omit<CreateFundMovement, 'group_uuid'> = {
  user_uuid: '',
  movement_type: MovementType.DEPOSIT,
  amount: 0,
  currency: 'USD',
  amount_usdt: 0,
  usdt_rate: 1,
  movement_date: new Date().toISOString().slice(0, 16),
  notes: '',
};

const emptyGroupForm: CreateFundGroup = { name: '', currency: '', description: '' };
const emptyMemberForm: AddFundMember = { user_uuid: '', is_fund_manager: false };

export function useFunds() {
  const { user } = useAuth();
  const isModeratorOrAbove = user?.role === Role.MODERATOR || user?.role === Role.ROOT;
  const isRoot = user?.role === Role.ROOT;
  const confirm = useConfirm();

  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [selectedGroupUuid, setSelectedGroupUuid] = useState<string>('');
  const [groupBalance, setGroupBalance] = useState<GroupBalance | null>(null);
  const [movements, setMovements] = useState<FundMovement[]>([]);
  const [availableUsers, setAvailableUsers] = useState<CommissionUserResponse[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyData[]>([]);
  // Clientes del bot (todos). Se derivan dos listas: personas (para el número del socio) y
  // grupos @g.us (para el JID del grupo).
  const [clients, setClients] = useState<ClientData[]>([]);

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsTotal, setMovementsTotal] = useState(0);

  const [movementFilters, setMovementFilters] = useState<FundMovementFilters>({});

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [showRegisterMovement, setShowRegisterMovement] = useState(false);

  const [createGroupForm, setCreateGroupForm] = useState<CreateFundGroup>(emptyGroupForm);
  const [editGroupForm, setEditGroupForm] = useState<UpdateFundGroup>({});
  const [addMemberForm, setAddMemberForm] = useState<AddFundMember>(emptyMemberForm);
  const [editMemberTarget, setEditMemberTarget] = useState<FundGroupMemberFlat | null>(null);
  const [editMemberForm, setEditMemberForm] = useState<UpdateFundMember>({});
  const [movementForm, setMovementForm] =
    useState<Omit<CreateFundMovement, 'group_uuid'>>(emptyMovementForm);

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Initial load
  useEffect(() => {
    const loadGroups = async () => {
      setLoadingGroups(true);
      const result = await fundService.getGroups();
      if (result.success && result.data) {
        setGroups(result.data);
        if (result.data.length > 0) {
          setSelectedGroupUuid(result.data[0].uuid);
        }
      } else {
        toast.error(result.error || 'Error al cargar los grupos');
      }
      setLoadingGroups(false);
    };

    const loadUsers = async () => {
      const result = await userService.getAvailableCommissionUsers();
      if (result.success && result.data) setAvailableUsers(result.data);
    };

    const loadCurrencies = async () => {
      const result = await adminService.getCurrencies(1, 100);
      if (result.success && result.data) setAvailableCurrencies(result.data.currencies);
    };

    const loadClients = async () => {
      const result = await clientService.getClients({ limit: 500 });
      if (result.success && result.data) setClients(result.data.items || []);
    };

    loadGroups();
    loadUsers();
    loadCurrencies();
    loadClients();
  }, []);

  // Load balance and movements when selected group / filters / page change
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
    } else if (!movementsResult.success) {
      toast.error(movementsResult.error || 'Error al cargar movimientos');
    }
    setLoadingMovements(false);
  }, [selectedGroupUuid, movementFilters, movementsPage]);

  useEffect(() => {
    setMovementsPage(1);
  }, [selectedGroupUuid, movementFilters]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  const totalMovementsPages = Math.max(1, Math.ceil(movementsTotal / MOVEMENTS_PER_PAGE));

  const getUserDisplayName = useCallback(
    (uuid: string) => {
      const u = availableUsers.find((x) => x.uuid === uuid);
      return u ? u.full_name || u.username : uuid;
    },
    [availableUsers]
  );

  // Dialog open helpers
  const openCreateGroup = useCallback(() => {
    setFormError('');
    setCreateGroupForm(emptyGroupForm);
    setShowCreateGroup(true);
  }, []);
  const closeCreateGroup = useCallback(() => setShowCreateGroup(false), []);

  const openAddMember = useCallback(() => {
    setFormError('');
    setAddMemberForm(emptyMemberForm);
    setShowAddMember(true);
  }, []);
  const closeAddMember = useCallback(() => setShowAddMember(false), []);

  const openRegisterMovement = useCallback(() => {
    setFormError('');
    setMovementForm({
      ...emptyMovementForm,
      movement_date: new Date().toISOString().slice(0, 16),
    });
    setShowRegisterMovement(true);
  }, []);
  const closeRegisterMovement = useCallback(() => setShowRegisterMovement(false), []);

  // Submit handlers
  const handleCreateGroup = useCallback(async () => {
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
    setFormLoading(false);
    if (result.success && result.data) {
      setGroups((prev) => [...prev, result.data!]);
      setSelectedGroupUuid(result.data.uuid);
      closeCreateGroup();
      toast.success('Grupo creado correctamente');
    } else {
      setFormError(result.error || 'Error al crear el grupo');
    }
  }, [createGroupForm, closeCreateGroup]);

  // Re-fetch ligero de grupos (sin toggle de loadingGroups) para refrescar la lista de
  // miembros tras agregar/editar, conservando el grupo seleccionado.
  const refreshGroups = useCallback(async () => {
    const result = await fundService.getGroups();
    if (result.success && result.data) setGroups(result.data);
  }, []);

  const openEditGroup = useCallback(() => {
    const g = groups.find((x) => x.uuid === selectedGroupUuid);
    setEditGroupForm({ whatsapp_group_jid: g?.whatsapp_group_jid ?? null });
    setFormError('');
    setShowEditGroup(true);
  }, [groups, selectedGroupUuid]);

  const closeEditGroup = useCallback(() => {
    setShowEditGroup(false);
    setFormError('');
  }, []);

  const handleUpdateGroup = useCallback(async () => {
    setFormError('');
    const jid = (editGroupForm.whatsapp_group_jid ?? '').trim();
    if (jid && !jid.endsWith('@g.us')) {
      setFormError('El JID debe terminar en @g.us');
      return;
    }
    setFormLoading(true);
    const payload: UpdateFundGroup = jid
      ? { whatsapp_group_jid: jid }
      : { clear_whatsapp_group_jid: true };
    const result = await fundService.updateGroup(selectedGroupUuid, payload);
    setFormLoading(false);
    if (result.success) {
      closeEditGroup();
      toast.success('Grupo actualizado correctamente');
      await refreshGroups();
    } else {
      setFormError(result.error || 'Error al actualizar el grupo');
    }
  }, [editGroupForm, selectedGroupUuid, closeEditGroup, refreshGroups]);

  const handleAddMember = useCallback(async () => {
    setFormError('');
    if (!addMemberForm.user_uuid) {
      setFormError('Selecciona un usuario');
      return;
    }
    setFormLoading(true);
    const result = await fundService.addMember(selectedGroupUuid, addMemberForm);
    setFormLoading(false);
    if (result.success) {
      closeAddMember();
      toast.success('Miembro agregado correctamente');
      refreshGroups();
      loadGroupData();
    } else {
      setFormError(result.error || 'Error al agregar miembro');
    }
  }, [addMemberForm, selectedGroupUuid, closeAddMember, loadGroupData, refreshGroups]);

  const openEditMember = useCallback((member: FundGroupMemberFlat) => {
    setEditMemberTarget(member);
    setEditMemberForm({
      is_fund_manager: member.is_fund_manager,
      whatsapp_phone: member.whatsapp_phone ?? null,
    });
    setFormError('');
    setShowEditMember(true);
  }, []);

  const closeEditMember = useCallback(() => {
    setShowEditMember(false);
    setEditMemberTarget(null);
    setFormError('');
  }, []);

  const handleUpdateMember = useCallback(async () => {
    if (!editMemberTarget) return;
    setFormError('');
    setFormLoading(true);
    const phone = (editMemberForm.whatsapp_phone ?? '').trim() || null;
    const payload: UpdateFundMember = {
      is_fund_manager: editMemberForm.is_fund_manager,
      ...(phone ? { whatsapp_phone: phone } : { clear_whatsapp_phone: true }),
    };
    const result = await fundService.updateMember(
      selectedGroupUuid,
      editMemberTarget.user_uuid,
      payload,
    );
    setFormLoading(false);
    if (result.success) {
      closeEditMember();
      toast.success('Miembro actualizado correctamente');
      await refreshGroups();
    } else {
      setFormError(result.error || 'Error al actualizar miembro');
    }
  }, [editMemberTarget, editMemberForm, selectedGroupUuid, closeEditMember, refreshGroups]);

  const handleRegisterMovement = useCallback(async () => {
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
    setFormLoading(false);
    if (result.success) {
      closeRegisterMovement();
      toast.success('Movimiento registrado correctamente');
      loadGroupData();
    } else {
      setFormError(result.error || 'Error al registrar movimiento');
    }
  }, [movementForm, selectedGroupUuid, closeRegisterMovement, loadGroupData]);

  const handleDeleteMovement = useCallback(
    async (movement: FundMovement) => {
      const ok = await confirm({
        title: '¿Eliminar movimiento?',
        description: 'Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        variant: 'destructive',
      });
      if (!ok) return;

      const result = await fundService.deleteMovement(movement.uuid);
      if (result.success) {
        toast.success('Movimiento eliminado');
        loadGroupData();
      } else {
        toast.error(result.error || 'Error al eliminar movimiento');
      }
    },
    [confirm, loadGroupData]
  );

  const resetFilters = useCallback(() => setMovementFilters({}), []);
  const hasActiveFilters =
    !!movementFilters.movement_type ||
    !!movementFilters.date_from ||
    !!movementFilters.date_to;

  const selectedGroup = groups.find((g) => g.uuid === selectedGroupUuid);
  const selectedGroupMembers = selectedGroup?.members ?? [];
  // Personas (para el número del socio) vs grupos @g.us (para el JID del grupo).
  const availableClients = clients.filter((c) => !isUnassignedClientPhone(c.phone));
  const availableGroupClients = clients.filter((c) => c.phone.endsWith('@g.us'));

  return {
    state: {
      isModeratorOrAbove,
      isRoot,
      groups,
      selectedGroupUuid,
      groupBalance,
      movements,
      availableUsers,
      availableCurrencies,
      availableClients,
      availableGroupClients,
      selectedGroup,
      selectedGroupMembers,
      loadingGroups,
      loadingBalance,
      loadingMovements,
      movementsPage,
      movementsTotal,
      movementsPerPage: MOVEMENTS_PER_PAGE,
      totalMovementsPages,
      movementFilters,
      hasActiveFilters,
      showCreateGroup,
      showEditGroup,
      showAddMember,
      showEditMember,
      showRegisterMovement,
      createGroupForm,
      editGroupForm,
      addMemberForm,
      editMemberTarget,
      editMemberForm,
      movementForm,
      formError,
      formLoading,
    },
    actions: {
      setSelectedGroupUuid,
      setMovementFilters,
      resetFilters,
      setMovementsPage,
      openCreateGroup,
      closeCreateGroup,
      openEditGroup,
      closeEditGroup,
      openAddMember,
      closeAddMember,
      openEditMember,
      closeEditMember,
      openRegisterMovement,
      closeRegisterMovement,
      setCreateGroupForm,
      setEditGroupForm,
      setAddMemberForm,
      setEditMemberForm,
      setMovementForm,
      handleCreateGroup,
      handleUpdateGroup,
      handleAddMember,
      handleUpdateMember,
      handleRegisterMovement,
      handleDeleteMovement,
      getUserDisplayName,
      reloadGroupData: loadGroupData,
    },
  };
}
