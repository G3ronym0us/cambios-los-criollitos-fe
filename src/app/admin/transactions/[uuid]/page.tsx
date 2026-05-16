"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { transactionService } from '@/services/transactionService';
import { userService } from '@/services/userService';
import { TransactionData, TransactionStatus } from '@/types/transaction';
import { ArrowLeft, TrendingUp, CheckCircle, Clock, XCircle, AlertCircle, DollarSign } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  [TransactionStatus.COMPLETED]: { color: 'bg-green-100 text-green-800', icon: <CheckCircle size={14} />, label: 'Completada' },
  [TransactionStatus.PENDING]:   { color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={14} />, label: 'Pendiente' },
  [TransactionStatus.CANCELLED]: { color: 'bg-gray-100 text-gray-800', icon: <XCircle size={14} />, label: 'Cancelada' },
  [TransactionStatus.FAILED]:    { color: 'bg-red-100 text-red-800', icon: <AlertCircle size={14} />, label: 'Fallida' },
};

export default function TransactionDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const [txResult, usersResult] = await Promise.all([
        transactionService.getTransactionById(uuid),
        userService.getAllUsers({ per_page: 500 }),
      ]);

      if (txResult.success && txResult.data) {
        setTransaction(txResult.data);
      } else {
        setError(txResult.error || 'Error al cargar la transacción');
      }

      if (usersResult.success && usersResult.data) {
        const users = Array.isArray(usersResult.data) ? usersResult.data : usersResult.data.users ?? [];
        const map: Record<string, string> = {};
        for (const u of users) {
          map[u.uuid] = u.full_name || u.username;
        }
        setUserMap(map);
      }

      setLoading(false);
    };
    load();
  }, [uuid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Transacción no encontrada'}
        </div>
        <button onClick={() => router.back()} className="mt-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Volver
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[transaction.status] || STATUS_CONFIG[TransactionStatus.PENDING];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={26} />
            {transaction.from_currency} → {transaction.to_currency}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{transaction.uuid}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ml-auto ${statusCfg.color}`}>
          {statusCfg.icon}
          {statusCfg.label}
        </span>
      </div>

      {/* Main Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Información General</h2>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="text-gray-500">Par</span>
            <p className="font-medium text-gray-900">{transaction.pair_symbol || `${transaction.from_currency}-${transaction.to_currency}`}</p>
          </div>

          <div>
            <span className="text-gray-500">Monto Origen</span>
            <p className="font-medium text-gray-900">{formatCurrency(transaction.from_amount)} {transaction.from_currency}</p>
          </div>

          {transaction.to_amount != null && (
            <div>
              <span className="text-gray-500">Monto Destino</span>
              <p className="font-medium text-gray-900">{formatCurrency(transaction.to_amount)} {transaction.to_currency}</p>
            </div>
          )}

          {transaction.exchange_rate != null && (
            <div>
              <span className="text-gray-500">Tasa</span>
              <p className="font-medium text-gray-900">{formatCurrency(transaction.exchange_rate)}</p>
            </div>
          )}

          {transaction.description && (
            <div className="col-span-2">
              <span className="text-gray-500">Descripción</span>
              <p className="font-medium text-gray-900">{transaction.description}</p>
            </div>
          )}

          <div>
            <span className="text-gray-500">Creado</span>
            <p className="font-medium text-gray-900">{formatDate(transaction.created_at)}</p>
          </div>

          {transaction.completed_at && (
            <div>
              <span className="text-gray-500">Completado</span>
              <p className="font-medium text-gray-900">{formatDate(transaction.completed_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Profit Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-green-800 uppercase tracking-wide mb-3 flex items-center gap-2">
          <TrendingUp size={16} />
          Ganancia Total
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-green-700">Porcentaje</span>
            <p className="text-xl font-bold text-green-900">{transaction.total_profit_percentage}%</p>
          </div>
          <div>
            <span className="text-green-700">Monto</span>
            <p className="text-xl font-bold text-green-900">
              {formatCurrency(transaction.profit_amount)} {transaction.to_currency}
            </p>
          </div>
          {transaction.profit_amount_usdt != null && (
            <div>
              <span className="text-green-700">Equivalente USDT</span>
              <p className="font-semibold text-green-900">{formatCurrency(transaction.profit_amount_usdt)} USDT</p>
            </div>
          )}
        </div>
      </div>

      {/* Profit Splits */}
      {transaction.profit_splits && transaction.profit_splits.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Distribución de Ganancias</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Liquidación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transaction.profit_splits.map((split) => (
                <tr key={split.uuid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {split.user?.username || userMap[split.user_uuid] || split.user_uuid}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">{split.profit_percentage}%</td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {formatCurrency(split.profit_amount)} {transaction.to_currency}
                    {split.profit_amount_usdt != null && (
                      <span className="block text-xs text-gray-400">≈ {formatCurrency(split.profit_amount_usdt)} USDT</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {split.settlement_amount != null && split.settlement_currency
                      ? `${formatCurrency(split.settlement_amount)} ${split.settlement_currency}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
