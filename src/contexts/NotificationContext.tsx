"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/utils/enums';
import { notificationsService } from '@/services/notificationsService';
import { RateAlert } from '@/types/notifications';

interface NotificationContextType {
  alerts: RateAlert[];
  unreadCount: number;
  isConnected: boolean;
  loading: boolean;
  acknowledge: (uuid: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};

const RECONNECT_DELAYS = [1000, 2000, 5000, 15000, 30000, 60000];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<RateAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const isPrivileged = user?.role === Role.MODERATOR || user?.role === Role.ROOT;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!isPrivileged) return;
    setLoading(true);
    try {
      const result = await notificationsService.getAlerts(50, true);
      if (result.success && result.data) {
        setAlerts(result.data.alerts);
        setUnreadCount(result.data.alerts.filter(a => !a.acknowledged_at).length);
      }
    } finally {
      setLoading(false);
    }
  }, [isPrivileged]);

  const acknowledge = useCallback(async (uuid: string) => {
    const result = await notificationsService.acknowledgeAlert(uuid);
    if (result.success) {
      setAlerts(prev => prev.map(a =>
        a.uuid === uuid ? { ...a, acknowledged_at: new Date().toISOString() } : a
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const connect = useCallback(() => {
    if (!isPrivileged) return;
    if (eventSourceRef.current) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const token = Cookies.get('access_token');
    if (!token) return;

    const url = `${apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
    };

    es.addEventListener('connected', () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
    });

    es.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(event.data) as RateAlert;
        if (!data?.uuid) return;
        setAlerts(prev => {
          if (prev.some(a => a.uuid === data.uuid)) return prev;
          return [data, ...prev];
        });
        if (!data.acknowledged_at) {
          setUnreadCount(prev => prev + 1);
        }
      } catch (err) {
        console.error('[Notifications] Failed to parse SSE payload', err);
      }
    };

    es.onerror = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;

      const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && isPrivileged) connect();
      }, delay);
    };
  }, [apiUrl, isPrivileged]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isPrivileged) {
      closeConnection();
      setAlerts([]);
      setUnreadCount(0);
      return;
    }

    refresh();
    connect();

    const handleVisibility = () => {
      if (document.hidden) {
        closeConnection();
      } else if (isPrivileged && !eventSourceRef.current) {
        reconnectAttemptRef.current = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      closeConnection();
    };
  }, [isPrivileged, connect, closeConnection, refresh]);

  const value: NotificationContextType = {
    alerts,
    unreadCount,
    isConnected,
    loading,
    acknowledge,
    refresh,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
