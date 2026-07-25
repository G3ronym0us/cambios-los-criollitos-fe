'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { fundService } from '@/services/fundService';
import { userService } from '@/services/userService';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { Role } from '@/utils/enums';
import { isUnassignedClientPhone } from '@/utils/functions';
import type { CurrencyData } from '@/types/admin';
import type { CommissionUserResponse } from '@/types/user';
import type { ClientData } from '@/types/client';
import type { FundGroup } from '@/types/fund';

/**
 * Recursos comunes a las tres pantallas de Fondos (listado, detalle e historial):
 * grupos, usuarios con comisión, monedas y clientes del bot. Cada pantalla monta este
 * hook y consume solo lo que necesita; los diálogos comparten estas listas.
 */
export function useFundsResources() {
  const { user } = useAuth();
  const isModeratorOrAbove = user?.role === Role.MODERATOR || user?.role === Role.ROOT;
  const isRoot = user?.role === Role.ROOT;

  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [availableUsers, setAvailableUsers] = useState<CommissionUserResponse[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const loadGroups = useCallback(async () => {
    const result = await fundService.getGroups();
    if (result.success && result.data) {
      setGroups(result.data);
    } else {
      toast.error(result.error || 'Error al cargar los grupos');
    }
  }, []);

  useEffect(() => {
    const boot = async () => {
      setLoadingGroups(true);
      await loadGroups();
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

    void boot();
    void loadUsers();
    void loadCurrencies();
    void loadClients();
  }, [loadGroups]);

  const availableGroupClients = useMemo(
    () => clients.filter((c) => c.phone.endsWith('@g.us')),
    [clients],
  );
  const availableClients = useMemo(
    () => clients.filter((c) => !isUnassignedClientPhone(c.phone)),
    [clients],
  );

  const getUserDisplayName = useCallback(
    (uuid: string, fallback?: string | null) => {
      const u = availableUsers.find((x) => x.uuid === uuid);
      if (u) return u.full_name || u.username;
      // Nombre que ya trae la propia entidad (p. ej. `movement.username`) antes que el uuid crudo.
      return fallback?.trim() || uuid;
    },
    [availableUsers],
  );

  return {
    isModeratorOrAbove,
    isRoot,
    groups,
    setGroups,
    loadingGroups,
    reloadGroups: loadGroups,
    availableUsers,
    availableCurrencies,
    availableGroupClients,
    availableClients,
    getUserDisplayName,
  };
}

export type FundsResources = ReturnType<typeof useFundsResources>;
