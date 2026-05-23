'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { notificationsService } from '@/services/notificationsService';
import { useNotifications } from '@/contexts/NotificationContext';
import type { RateAlert } from '@/types/notifications';

const PAGE_LIMIT = 50;

export function useAlerts() {
  const { acknowledge: ackFromContext } = useNotifications();
  const [alerts, setAlerts] = useState<RateAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [unackedOnly, setUnackedOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await notificationsService.getAlerts(PAGE_LIMIT, unackedOnly);
    if (result.success && result.data) {
      setAlerts(result.data.alerts);
      setTotal(result.data.total);
    } else {
      toast.error(result.error || 'Error al cargar alertas');
    }
    setLoading(false);
  }, [unackedOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAck = useCallback(
    async (uuid: string) => {
      await ackFromContext(uuid);
      setAlerts((prev) =>
        prev.map((a) =>
          a.uuid === uuid ? { ...a, acknowledged_at: new Date().toISOString() } : a
        )
      );
      toast.success('Alerta marcada como vista');
    },
    [ackFromContext]
  );

  const stats = useMemo(() => {
    const unseen = alerts.filter((a) => !a.acknowledged_at).length;
    return { total, unseen };
  }, [alerts, total]);

  return {
    state: {
      alerts,
      loading,
      unackedOnly,
      stats,
    },
    actions: {
      setUnackedOnly,
      load,
      handleAck,
    },
  };
}
