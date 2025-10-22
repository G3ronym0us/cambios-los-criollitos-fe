"use client";

import { useState, useEffect } from "react";
import { transactionService } from "@/services/transactionService";
import { ProfitSummary } from "@/types/transaction";
import { TrendingUp, Users, DollarSign, Repeat } from "lucide-react";

export default function SummaryReportPage() {
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastDays, setLastDays] = useState<number>(30);

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      const result = await transactionService.getSummaryReport(lastDays);

      if (result.success && result.data) {
        setSummary(result.data);
      }
      setLoading(false);
    };
    
    loadSummary();
  }, [lastDays]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resumen General</h1>
          <p className="text-gray-600 text-sm mt-1">
            Estadísticas completas del sistema
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Período
          </label>
          <select
            value={lastDays}
            onChange={(e) => setLastDays(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={365}>Último año</option>
          </select>
        </div>
      </div>

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-100">Ganancia Total</span>
                <DollarSign size={24} />
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(summary.total_profit)}
              </p>
              <p className="text-green-100 text-sm mt-2">
                En {summary.total_transactions} transacciones
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100">Total de Transacciones</span>
                <Repeat size={24} />
              </div>
              <p className="text-3xl font-bold">{summary.total_transactions}</p>
              <p className="text-blue-100 text-sm mt-2">
                Promedio:{" "}
                {summary.total_transactions > 0
                  ? formatCurrency(
                      summary.total_profit / summary.total_transactions
                    )
                  : 0}{" "}
                por transacción
              </p>
            </div>
          </div>

          {/* Distribution by Currency Pair */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp size={20} />
                Distribución por Par de Monedas
              </h2>
            </div>

            {summary.by_currency_pair.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No hay datos disponibles para este período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Par de Monedas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transacciones
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ganancia Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % del Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.by_currency_pair
                      .sort((a, b) => b.total_profit - a.total_profit)
                      .map((pair) => {
                        const percentage =
                          (pair.total_profit / summary.total_profit) * 100;
                        return (
                          <tr
                            key={pair.currency_pair}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-medium text-gray-900">
                                {pair.currency_pair}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {pair.transaction_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-green-600">
                                {formatCurrency(pair.total_profit)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div
                                  className="w-full bg-gray-200 rounded-full h-2 mr-2"
                                  style={{ maxWidth: "100px" }}
                                >
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Distribution by User */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} />
                Distribución por Usuario
              </h2>
            </div>

            {summary.by_user.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No hay datos disponibles para este período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transacciones
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ganancia Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % del Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.by_user
                      .sort((a, b) => b.total_profit - a.total_profit)
                      .map((user) => {
                        const percentage =
                          (user.total_profit / summary.total_profit) * 100;
                        return (
                          <tr key={user.user_uuid} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold">
                                    {user.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <p className="font-medium text-gray-900">
                                    {user.username}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {user.user_uuid.substring(0, 8)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {user.transaction_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-green-600">
                                {formatCurrency(user.total_profit)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div
                                  className="w-full bg-gray-200 rounded-full h-2 mr-2"
                                  style={{ maxWidth: "100px" }}
                                >
                                  <div
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
