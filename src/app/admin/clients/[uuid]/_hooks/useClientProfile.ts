'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { clientService } from '@/services/clientService';
import { ClientData, ClientUpdate } from '@/types/client';

export function useClientProfile(uuid: string) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await clientService.getClient(uuid);
    if (result.success && result.data) {
      setClient(result.data);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = useCallback(() => setEditing(true), []);
  const closeEdit = useCallback(() => setEditing(false), []);

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
    state: { client, loading, notFound, editing, submitting },
    actions: { openEdit, closeEdit, handleUpdate, reload: load },
  };
}
