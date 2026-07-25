'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { fundService } from '@/services/fundService';
import { useConfirm } from '@/hooks/useConfirm';
import {
  AddFundMember,
  CreateFundGroup,
  CreateFundMovement,
  FundGroup,
  FundGroupMemberFlat,
  FundMovement,
  MovementType,
  UpdateFundGroup,
  UpdateFundMember,
} from '@/types/fund';
import type { FundsResources } from './useFundsResources';

type MovementDraft = Omit<CreateFundMovement, 'group_uuid'>;

const emptyMovementForm: MovementDraft = {
  user_uuid: '',
  // Los depósitos ya no se cargan como movimiento (van por «Depósitos pendientes»).
  movement_type: MovementType.EXCHANGE,
  amount: 0,
  currency: 'USD',
  amount_usdt: 0,
  usdt_rate: 1,
  movement_date: new Date().toISOString().slice(0, 16),
  notes: '',
};

const emptyGroupForm: CreateFundGroup = { name: '', currency: '', description: '' };
const emptyMemberForm: AddFundMember = { user_uuid: '', is_fund_manager: false };

interface UseFundMutationsOptions {
  resources: FundsResources;
  /** Grupo objetivo por defecto para las mutaciones de detalle/historial. */
  defaultGroupUuid?: string;
  /** Se invoca tras cualquier cambio (recargar balance/movimientos de la pantalla activa). */
  onChanged?: () => void;
}

/**
 * Estado y handlers de TODOS los diálogos de Fondos (crear/editar grupo, agregar/editar
 * miembro, registrar/eliminar movimiento). Es compartido por las tres pantallas: los
 * `open*` aceptan el grupo objetivo (el listado los abre por fila; detalle e historial
 * usan `defaultGroupUuid`).
 */
export function useFundMutations({
  resources,
  defaultGroupUuid,
  onChanged,
}: UseFundMutationsOptions) {
  const confirm = useConfirm();
  const { setGroups, reloadGroups } = resources;

  const [targetGroupUuid, setTargetGroupUuid] = useState('');

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [showRegisterMovement, setShowRegisterMovement] = useState(false);

  const [createGroupForm, setCreateGroupForm] = useState<CreateFundGroup>(emptyGroupForm);
  const [editGroupTarget, setEditGroupTarget] = useState<FundGroup | null>(null);
  const [editGroupForm, setEditGroupForm] = useState<UpdateFundGroup>({});
  const [addMemberForm, setAddMemberForm] = useState<AddFundMember>(emptyMemberForm);
  const [editMemberTarget, setEditMemberTarget] = useState<FundGroupMemberFlat | null>(null);
  const [editMemberForm, setEditMemberForm] = useState<UpdateFundMember>({});
  const [movementForm, setMovementForm] = useState<MovementDraft>(emptyMovementForm);

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const resolveTarget = useCallback(
    (uuid?: string) => uuid || defaultGroupUuid || '',
    [defaultGroupUuid],
  );

  // ---- Crear grupo ----
  const openCreateGroup = useCallback(() => {
    setFormError('');
    setCreateGroupForm(emptyGroupForm);
    setShowCreateGroup(true);
  }, []);
  const closeCreateGroup = useCallback(() => setShowCreateGroup(false), []);

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
      closeCreateGroup();
      toast.success('Grupo creado correctamente');
      onChanged?.();
    } else {
      setFormError(result.error || 'Error al crear el grupo');
    }
  }, [createGroupForm, setGroups, closeCreateGroup, onChanged]);

  // ---- Editar grupo ----
  const openEditGroup = useCallback((group: FundGroup) => {
    setTargetGroupUuid(group.uuid);
    setEditGroupTarget(group);
    setEditGroupForm({
      whatsapp_group_jid: group.whatsapp_group_jid ?? null,
      default_profit_percentage: group.default_profit_percentage ?? null,
    });
    setFormError('');
    setShowEditGroup(true);
  }, []);
  const closeEditGroup = useCallback(() => {
    setShowEditGroup(false);
    setEditGroupTarget(null);
    setFormError('');
  }, []);

  const handleUpdateGroup = useCallback(async () => {
    if (!targetGroupUuid) return;
    setFormError('');
    const jid = (editGroupForm.whatsapp_group_jid ?? '').trim();
    if (jid && !jid.endsWith('@g.us')) {
      setFormError('El JID debe terminar en @g.us');
      return;
    }
    const profit = editGroupForm.default_profit_percentage;
    if (profit != null && (profit < 0 || profit > 99)) {
      setFormError('La ganancia del fondo va entre 0 y 99%');
      return;
    }
    setFormLoading(true);
    const payload: UpdateFundGroup = {
      ...(jid ? { whatsapp_group_jid: jid } : { clear_whatsapp_group_jid: true }),
      ...(profit != null
        ? { default_profit_percentage: profit }
        : { clear_default_profit_percentage: true }),
    };
    const result = await fundService.updateGroup(targetGroupUuid, payload);
    setFormLoading(false);
    if (result.success) {
      closeEditGroup();
      toast.success('Grupo actualizado correctamente');
      await reloadGroups();
      onChanged?.();
    } else {
      setFormError(result.error || 'Error al actualizar el grupo');
    }
  }, [targetGroupUuid, editGroupForm, closeEditGroup, reloadGroups, onChanged]);

  // ---- Agregar miembro ----
  const openAddMember = useCallback((groupUuid?: string) => {
    setTargetGroupUuid(resolveTarget(groupUuid));
    setFormError('');
    setAddMemberForm(emptyMemberForm);
    setShowAddMember(true);
  }, [resolveTarget]);
  const closeAddMember = useCallback(() => setShowAddMember(false), []);

  const handleAddMember = useCallback(async () => {
    if (!targetGroupUuid) return;
    setFormError('');
    if (!addMemberForm.user_uuid) {
      setFormError('Selecciona un usuario');
      return;
    }
    setFormLoading(true);
    const result = await fundService.addMember(targetGroupUuid, addMemberForm);
    setFormLoading(false);
    if (result.success) {
      closeAddMember();
      toast.success('Miembro agregado correctamente');
      await reloadGroups();
      onChanged?.();
    } else {
      setFormError(result.error || 'Error al agregar miembro');
    }
  }, [targetGroupUuid, addMemberForm, closeAddMember, reloadGroups, onChanged]);

  // ---- Editar miembro ----
  const openEditMember = useCallback(
    (member: FundGroupMemberFlat, groupUuid?: string) => {
      setTargetGroupUuid(resolveTarget(groupUuid));
      setEditMemberTarget(member);
      setEditMemberForm({
        is_fund_manager: member.is_fund_manager,
        profit_share_percentage: member.profit_share_percentage ?? null,
        whatsapp_phone: member.whatsapp_phone ?? null,
      });
      setFormError('');
      setShowEditMember(true);
    },
    [resolveTarget],
  );
  const closeEditMember = useCallback(() => {
    setShowEditMember(false);
    setEditMemberTarget(null);
    setFormError('');
  }, []);

  const handleUpdateMember = useCallback(async () => {
    if (!editMemberTarget || !targetGroupUuid) return;
    setFormError('');
    setFormLoading(true);
    const phone = (editMemberForm.whatsapp_phone ?? '').trim() || null;
    const share = editMemberForm.profit_share_percentage;
    if (share != null && (share < 0 || share > 100)) {
      setFormError('La parte de la ganancia va entre 0 y 100%');
      return;
    }
    const payload: UpdateFundMember = {
      is_fund_manager: editMemberForm.is_fund_manager,
      ...(share != null ? { profit_share_percentage: share } : {}),
      ...(phone ? { whatsapp_phone: phone } : { clear_whatsapp_phone: true }),
    };
    const result = await fundService.updateMember(
      targetGroupUuid,
      editMemberTarget.user_uuid,
      payload,
    );
    setFormLoading(false);
    if (result.success) {
      closeEditMember();
      toast.success('Miembro actualizado correctamente');
      await reloadGroups();
      onChanged?.();
    } else {
      setFormError(result.error || 'Error al actualizar miembro');
    }
  }, [editMemberTarget, targetGroupUuid, editMemberForm, closeEditMember, reloadGroups, onChanged]);

  // ---- Registrar movimiento ----
  const openRegisterMovement = useCallback((groupUuid?: string) => {
    setTargetGroupUuid(resolveTarget(groupUuid));
    setFormError('');
    setMovementForm({ ...emptyMovementForm, movement_date: new Date().toISOString().slice(0, 16) });
    setShowRegisterMovement(true);
  }, [resolveTarget]);
  const closeRegisterMovement = useCallback(() => setShowRegisterMovement(false), []);

  const handleRegisterMovement = useCallback(async () => {
    if (!targetGroupUuid) return;
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
      group_uuid: targetGroupUuid,
    });
    setFormLoading(false);
    if (result.success) {
      closeRegisterMovement();
      toast.success('Movimiento registrado correctamente');
      onChanged?.();
    } else {
      setFormError(result.error || 'Error al registrar movimiento');
    }
  }, [targetGroupUuid, movementForm, closeRegisterMovement, onChanged]);

  // ---- Eliminar movimiento ----
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
        onChanged?.();
      } else {
        toast.error(result.error || 'Error al eliminar movimiento');
      }
    },
    [confirm, onChanged],
  );

  return {
    state: {
      showCreateGroup,
      showEditGroup,
      showAddMember,
      showEditMember,
      showRegisterMovement,
      createGroupForm,
      editGroupTarget,
      editGroupForm,
      addMemberForm,
      editMemberTarget,
      editMemberForm,
      movementForm,
      formError,
      formLoading,
    },
    actions: {
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
    },
  };
}

export type FundMutations = ReturnType<typeof useFundMutations>;
