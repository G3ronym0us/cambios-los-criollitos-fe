"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { notificationsService } from '@/services/notificationsService';
import { useNotifications } from '@/contexts/NotificationContext';
import { RateAlert } from '@/types/notifications';

const PAGE_LIMIT = 50;

export default function AlertsPage() {
  const { acknowledge: ackFromContext } = useNotifications();
  const [alerts, setAlerts] = useState<RateAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [unackedOnly, setUnackedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await notificationsService.getAlerts(PAGE_LIMIT, unackedOnly);
    if (result.success && result.data) {
      setAlerts(result.data.alerts);
      setTotal(result.data.total);
    } else {
      setError(result.error || 'Error al cargar alertas');
    }
    setLoading(false);
  }, [unackedOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAck = async (uuid: string) => {
    await ackFromContext(uuid);
    setAlerts(prev => prev.map(a =>
      a.uuid === uuid ? { ...a, acknowledged_at: new Date().toISOString() } : a
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas de divergencia</h1>
          <p className="text-sm text-gray-500 mt-1">
            Divergencias detectadas entre tasa manual y tasa automática.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refrescar
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={unackedOnly}
            onChange={(e) => setUnackedOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Solo no vistas
        </label>
        <span className="ml-4 text-sm text-gray-500">
          Total: <span className="font-medium">{total}</span>
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Par</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Manual</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Automática</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Diferencia</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  {loading ? 'Cargando...' : 'No hay alertas'}
                </td>
              </tr>
            ) : (
              alerts.map(a => {
                const diffAbs = Math.abs(a.diff_percentage);
                const diffColor = diffAbs >= 3 ? 'text-red-600' : diffAbs >= 1 ? 'text-amber-600' : 'text-gray-600';
                const isAcked = !!a.acknowledged_at;
                return (
                  <tr key={a.uuid} className={isAcked ? 'opacity-60' : ''}>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className={diffColor} />
                        <span className="font-medium">{a.from_currency}/{a.to_currency}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-mono">{a.manual_rate}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono">{a.automatic_rate}</td>
                    <td className={`px-4 py-2 text-sm text-right font-semibold ${diffColor}`}>
                      {a.diff_percentage > 0 ? '+' : ''}
                      {a.diff_percentage.toFixed(3)}%
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(a.created_at).toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {isAcked ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <Check size={12} /> Vista
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                          No vista
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {!isAcked && (
                        <button
                          onClick={() => handleAck(a.uuid)}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                        >
                          Marcar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
