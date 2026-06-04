'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { operationService } from '@/services/operationService';
import { CurrencyPairData } from '@/types/admin';
import { ClientData, ClientUpdate } from '@/types/client';
import { OperationData } from '@/types/operation';

export function useClientProfile(uuid: string) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [operations, setOperations] = useState<OperationData[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(true);
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [savingPair, setSavingPair] = useState(false);

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

  // Pares activos para el selector inline del par preferido.
  useEffect(() => {
    adminService.getCurrencyPairs(0, 200, true).then((result) => {
      if (result.success && result.data) setPairs(result.data.pairs);
    });
  }, []);

  const openEdit = useCallback(() => setEditing(true), []);
  const closeEdit = useCallback(() => setEditing(false), []);

  // Guarda el par preferido directo desde la ficha (sin abrir el diálogo).
  const updatePreferredPair = useCallback(
    async (pairUuid: string | null) => {
      setSavingPair(true);
      const result = await clientService.updateClient(uuid, { preferred_pair_uuid: pairUuid });
      setSavingPair(false);
      if (result.success && result.data) {
        toast.success('Par por defecto actualizado');
        setClient(result.data);
      } else {
        toast.error(result.error || 'Error al actualizar el par por defecto');
      }
    },
    [uuid]
  );

  const handleUpdate = useCallback(
    async (data: ClientUpdate) => {
      setSubmitting(true);
      const result = await clientService.updateClient(uuid, data);
      setSubmitting(false);
      if (result.success && result.data) {
        toast.success('Cliente actualizado correctamente');
        setClient(result.data);
        setEditing(false);
      } else {
        toast.error(result.error || 'Error al actualizar el cliente');
      }
    },
    [uuid]
  );

  return {
    state: {
      client,
      loading,
      notFound,
      editing,
      submitting,
      operations,
      operationsLoading,
      pairs,
      savingPair,
    },
    actions: { openEdit, closeEdit, handleUpdate, updatePreferredPair, reload: load },
  };
}
