"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { transactionService } from '@/services/transactionService';
import { userService } from '@/services/userService';
import { UserProfitReport } from '@/types/transaction';
import { CommissionUserResponse } from '@/types/user';
import { TrendingUp, DollarSign, FileText, Calendar } from 'lucide-react';

function UserReportContent() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<UserProfitReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<CommissionUserResponse[]>([]);
  const [selectedUserUuid, setSelectedUserUuid] = useState(searchParams.get('user_uuid') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  useEffect(() => {
    userService.getAvailableCommissionUsers().then((result) => {
      if (result.success && result.data) {
        const data = result.data as unknown;
        setUsers(Array.isArray(data) ? data : ((data as { users?: CommissionUserResponse[] }).users ?? []));
      }
    });
  }, []);

  const loadReport = useCallback(async (targetPage = page) => {
    if (!selectedUserUuid) return;
    setLoading(true);
    const result = await transactionService.getUserProfitReport(
      selectedUserUuid,
      startDate || undefined,
      endDate || undefined,
      targetPage,
      PER_PAGE
    );
    if (result.success && result.data) {
      setReport(result.data);
    }
    setLoading(false);
  }, [selectedUserUuid, startDate, endDate, page]);

  // Auto-load when user_uuid comes from query param
  useEffect(() => {
    if (selectedUserUuid) {
      loadReport();
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString ?? '';
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reporte por Usuario</h1>
        <p className="text-gray-600 text-sm mt-1">Ganancias de un usuario específico</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <select
              value={selectedUserUuid}
              onChange={(e) => { setSelectedUserUuid(e.target.value); setReport(null); }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Seleccionar usuario...</option>
              {users.map((u) => (
                <option key={u.uuid} value={u.uuid}>
                  {u.full_name || u.username} — {u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => { setPage(1); loadReport(1); }}
              disabled={!selectedUserUuid || loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      </div>

      {!selectedUserUuid && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
          <TrendingUp className="mx-auto text-gray-300 mb-4" size={48} />
          <p>Selecciona un usuario para ver su reporte de ganancias</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}

      {report && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-100">Ganancia Total</span>
                <DollarSign size={24} />
              </div>
              <p className="text-3xl font-bold">{formatCurrency(report.total_profit)}</p>
              <p className="text-green-100 text-sm mt-1">{report.username} · {report.email}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100">Total de Transacciones</span>
                <FileText size={24} />
              </div>
              <p className="text-3xl font-bold">{report.transaction_count}</p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Detalle de Transacciones</h2>
            </div>

            {(report.transactions ?? []).length === 0 ? (
              <div className="p-12 text-center">
                <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay transacciones en este período</h3>
                <p className="text-gray-600">Intenta ajustar el rango de fechas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Par de Monedas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ganancia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(report.transactions ?? []).map((tx) => (
                      <tr key={tx.uuid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{(tx.uuid ?? '').substring(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {tx.from_currency} → {tx.to_currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">
                            +{formatCurrency(tx.profit_amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(tx.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {report.total_pages > 1 && (
              <div className="flex justify-center items-center gap-2 px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadReport(p); }}
                  disabled={page === 1 || loading}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {report.page} de {report.total_pages} · {report.transaction_count} transacciones
                </span>
                <button
                  onClick={() => { const p = page + 1; setPage(p); loadReport(p); }}
                  disabled={page >= report.total_pages || loading}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function UserReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <UserReportContent />
    </Suspense>
  );
}
