'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { notificationsService } from '@/services/notificationsService';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function isIosWithoutPwa(): boolean {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true);
  return isIos && !isStandalone;
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setSupported(ok);
    if (!ok) return;

    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  const enable = useCallback(async () => {
    setLoading(true);
    try {
      if (isIosWithoutPwa()) {
        toast.error(
          'En iPhone primero instala la app: Safari → Compartir → Añadir a pantalla de inicio.'
        );
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permiso de notificaciones denegado en el navegador.');
        return;
      }

      const keyResult = await notificationsService.getPushPublicKey();
      if (!keyResult.success || !keyResult.data) {
        toast.error(keyResult.error || 'El servidor no tiene Web Push configurado.');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyResult.data.public_key) as BufferSource,
        }));

      const saveResult = await notificationsService.pushSubscribe(sub.toJSON());
      if (!saveResult.success) {
        toast.error(saveResult.error || 'No se pudo registrar la suscripción.');
        return;
      }

      setSubscribed(true);
      toast.success('Notificaciones activadas en este dispositivo.');
    } catch (err) {
      console.error('[push] enable failed:', err);
      toast.error('No se pudieron activar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await notificationsService.pushUnsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success('Notificaciones desactivadas en este dispositivo.');
    } catch (err) {
      console.error('[push] disable failed:', err);
      toast.error('No se pudieron desactivar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    const result = await notificationsService.pushTest();
    if (result.success) {
      toast.success('Notificación de prueba enviada.');
    } else {
      toast.error(result.error || 'No se pudo enviar la prueba.');
    }
  }, []);

  return {
    state: { supported, subscribed, loading },
    actions: { enable, disable, sendTest },
  };
}
