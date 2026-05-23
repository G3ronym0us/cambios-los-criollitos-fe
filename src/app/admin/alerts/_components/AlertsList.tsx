'use client';

import { BellOff } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import type { RateAlert } from '@/types/notifications';
import { AlertItem } from './AlertItem';

interface AlertsListProps {
  alerts: RateAlert[];
  loading: boolean;
  unackedOnly: boolean;
  onAck: (uuid: string) => void;
}

export function AlertsList({ alerts, loading, unackedOnly, onAck }: AlertsListProps) {
  if (loading && alerts.length === 0) {
    return <LoadingState label="Cargando alertas..." />;
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title={unackedOnly ? 'No hay alertas sin ver' : 'No hay alertas'}
        description={
          unackedOnly
            ? 'Las alertas que aparezcan en el futuro se mostrarán aquí.'
            : 'No se ha detectado ninguna divergencia entre tasas manuales y automáticas.'
        }
      />
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
      {alerts.map((alert) => (
        <AlertItem key={alert.uuid} alert={alert} onAck={onAck} />
      ))}
    </div>
  );
}
