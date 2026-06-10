'use client';

import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushToggle() {
  const { state, actions } = usePushNotifications();

  if (!state.supported) return null;

  if (!state.subscribed) {
    return (
      <Button onClick={actions.enable} disabled={state.loading} size="lg">
        <Bell className="h-4 w-4" />
        Activar notificaciones
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="lg" onClick={actions.sendTest} disabled={state.loading}>
        <BellRing className="h-4 w-4" />
        Probar
      </Button>
      <Button variant="outline" size="lg" onClick={actions.disable} disabled={state.loading}>
        <BellOff className="h-4 w-4" />
        Desactivar
      </Button>
    </div>
  );
}
