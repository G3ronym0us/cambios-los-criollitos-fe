'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { operationService } from '@/services/operationService';
import { CurrencyPairData } from '@/types/admin';
import { BalanceAdjust, BalanceSummary, ClientData, ClientUpdate } from '@/types/client';
import { OperationData } from '@/types/operation';

export function useClientProfile(uuid: string) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operations, setOperations] = useState<OperationData[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(true);
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Saldo a favor + movimientos del ledger.
  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    const result = await clientService.getClientBalance(uuid);
    setBalance(result.success && result.data ? result.data : null);
    setBalanceLoading(false);
  }, [uuid]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // Carga las operaciones (transacciones) del cliente filtrando por su teléfono.
  const loadOperations = useCallback(async (phone: string) => {
    setOperationsLoading(true);
    const result = await operationService.getOperations({ phone, limit: 200 });
    setOperations(result.success && result.data ? result.data.operations : []);
    setOperationsLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await clientService.getClient(uuid);
    if (result.success && result.data) {
      setClient(result.data);
      setNotFound(false);
      loadOperations(result.data.phone);
    } else {
      setNotFound(true);
      setOperationsLoading(false);
    }
    setLoading(false);
  }, [uuid, loadOperations]);

  useEffect(() => {
    load();
  }, [load]);

  // Pares activos para el selector del par preferido.
  useEffect(() => {
    adminService.getCurrencyPairs(0, 200, true).then((result) => {
      if (result.success && result.data) setPairs(result.data.pairs);
    });
  }, []);

  // Updater genérico de cualquier campo del cliente (nombre, par, switches).
  // Devuelve true si guardó, para que el caller cierre su drawer de confirmación.
  const updateFields = useCallback(
    async (data: ClientUpdate, successMessage = 'Cliente actualizado'): Promise<boolean> => {
      setSaving(true);
      const result = await clientService.updateClient(uuid, data);
      setSaving(false);
      if (result.success && result.data) {
        toast.success(successMessage);
        setClient(result.data);
        return true;
      }
      toast.error(result.error || 'Error al actualizar el cliente');
      return false;
    },
    [uuid]
  );

  // Ajuste manual del saldo (CREDIT/DEBIT). Refresca el resumen al guardar.
  const adjustBalance = useCallback(
    async (data: BalanceAdjust): Promise<boolean> => {
      const result = await clientService.adjustClientBalance(uuid, data);
      if (result.success) {
        toast.success(data.entry_type === 'CREDIT' ? 'Saldo acreditado' : 'Saldo debitado');
        loadBalance();
        return true;
      }
      toast.error(result.error || 'No se pudo ajustar el saldo');
      return false;
    },
    [uuid, loadBalance]
  );

  return {
    state: { client, loading, notFound, saving, operations, operationsLoading, pairs, balance, balanceLoading },
    actions: { updateFields, reload: load, adjustBalance },
  };
}
