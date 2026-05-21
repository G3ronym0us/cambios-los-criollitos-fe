"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { RateAlert } from '@/types/notifications';

function formatRelative(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'hace un momento';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AlertRow({ alert, onAcknowledge }: { alert: RateAlert; onAcknowledge: (uuid: string) => void }) {
  const isAcked = !!alert.acknowledged_at;
  const diffAbs = Math.abs(alert.diff_percentage);
  const diffColor = diffAbs >= 3 ? 'text-red-600' : diffAbs >= 1 ? 'text-amber-600' : 'text-gray-600';

  return (
    <div className={`px-3 py-2 border-b border-gray-100 last:border-b-0 ${isAcked ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className={diffColor} />
            <span className="font-medium text-sm text-gray-900">
              {alert.from_currency}/{alert.to_currency}
            </span>
            <span className={`text-sm font-semibold ${diffColor}`}>
              {alert.diff_percentage > 0 ? '+' : ''}
              {alert.diff_percentage.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Manual: <span className="font-mono">{alert.manual_rate}</span>
            {' · '}
            Auto: <span className="font-mono">{alert.automatic_rate}</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">{formatRelative(alert.created_at)}</div>
        </div>
        {!isAcked && (
          <button
            onClick={() => onAcknowledge(alert.uuid)}
            className="flex-shrink-0 p-1.5 rounded hover:bg-green-50 text-green-600"
            title="Marcar como vista"
          >
            <Check size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { alerts, unreadCount, isConnected, loading, acknowledge, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const visibleAlerts = alerts.slice(0, 10);
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-md text-gray-600 hover:bg-gray-100"
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
            {badgeText}
          </span>
        )}
        <span
          className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
          title={isConnected ? 'Conectado' : 'Desconectado'}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">Alertas de divergencia</h3>
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
              title="Refrescar"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {visibleAlerts.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                {loading ? 'Cargando...' : 'No hay alertas'}
              </div>
            ) : (
              visibleAlerts.map(a => (
                <AlertRow key={a.uuid} alert={a} onAcknowledge={acknowledge} />
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-gray-200">
            <Link
              href="/admin/alerts"
              onClick={() => setOpen(false)}
              className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todas las alertas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
