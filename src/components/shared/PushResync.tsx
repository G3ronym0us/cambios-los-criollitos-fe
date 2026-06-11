'use client';

import { useEffect } from 'react';
import Cookies from 'js-cookie';
import { notificationsService } from '@/services/notificationsService';

/**
 * Re-registra en el backend la suscripción push local al abrir la app.
 *
 * Si el push service devuelve 410 (suscripción rotada/expirada), el backend
 * borra la fila y las alertas dejan de llegar aunque el navegador siga
 * mostrando el toggle como activo. Este re-sync silencioso e idempotente
 * cura esa divergencia en cada apertura con sesión activa.
 */
export function PushResync() {
  useEffect(() => {
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    )
      return;
    if (Notification.permission !== 'granted') return;
    if (!Cookies.get('access_token')) return;

    navigator.serviceWorker
      .getRegistration()
      .then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        if (sub) await notificationsService.pushSubscribe(sub.toJSON());
      })
      .catch(() => {
        /* best-effort: nunca romper la app por el re-sync */
      });
  }, []);

  return null;
}
