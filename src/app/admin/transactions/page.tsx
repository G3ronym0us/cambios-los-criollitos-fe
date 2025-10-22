"use client";

import { useState, useEffect, useCallback } from 'react';
import { transactionService } from '@/services/transactionService';
import { TransactionData, TransactionStatus, TransactionFilters } from '@/types/transaction';
import { Plus, Filter, Edit, Trash2, Eye, DollarSign, TrendingUp, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    per_page: 20
  });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const result = await transactionService.getTransactions({ ...filters, page });

    if (result.success && result.data) {
      setTransactions(result.data.transactions);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleDelete = async (uuid: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta transacción?')) return;

    const result = await transactionService.deleteTransaction(uuid);
    if (result.success) {
      loadTransactions();
    } else {
      alert(result.error || 'Error al eliminar la transacción');
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const config = {
      [TransactionStatus.COMPLETED]: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle size={14} />,
        label: 'Completada'
      },
      [TransactionStatus.PENDING]: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock size={14} />,
        label: 'Pendiente'
      },
      [TransactionStatus.CANCELLED]: {
        color: 'bg-gray-100 text-gray-800',
        icon: <XCircle size={14} />,
        label: 'Cancelada'
      },
      [TransactionStatus.FAILED]: {
        color: 'bg-red-100 text-red-800',
        icon: <AlertCircle size={14} />,
        label: 'Fallida'
      },
    } as const;

    // Default to pending if status is not found
    const statusConfig = config[status as keyof typeof config] || config[TransactionStatus.PENDING];
    const { color, icon, label } = statusConfig;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {icon}
        {label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading && transactions.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
          <p className="text-gray-600 text-sm mt-1">Gestión de transacciones y ganancias</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter size={16} />
            Filtros
          </button>

          <Link
            href="/admin/transactions/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            Nueva Transacción
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filters.status_filter || ''}
                onChange={(e) => setFilters({ ...filters, status_filter: e.target.value as TransactionStatus || undefined })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Todos</option>
                <option value={TransactionStatus.COMPLETED}>Completada</option>
                <option value={TransactionStatus.PENDING}>Pendiente</option>
                <option value={TransactionStatus.CANCELLED}>Cancelada</option>
                <option value={TransactionStatus.FAILED}>Fallida</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Origen</label>
              <input
                type="text"
                placeholder="Ej: Zelle, USDT"
                value={filters.from_currency || ''}
                onChange={(e) => setFilters({ ...filters, from_currency: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Destino</label>
              <input
                type="text"
                placeholder="Ej: VES, COP"
                value={filters.to_currency || ''}
                onChange={(e) => setFilters({ ...filters, to_currency: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setFilters({ page: 1, per_page: 20 });
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Limpiar
            </button>
            <button
              onClick={() => {
                setPage(1);
                loadTransactions();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="space-y-4">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay transacciones</h3>
            <p className="text-gray-600 mb-4">Comienza creando tu primera transacción</p>
            <Link
              href="/admin/transactions/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} />
              Nueva Transacción
            </Link>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.uuid} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {transaction.from_currency} → {transaction.to_currency}
                      </h3>
                      {getStatusBadge(transaction.status)}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Monto:</span> {formatCurrency(transaction.from_amount)} {transaction.from_currency}
                        → {formatCurrency(transaction.to_amount)} {transaction.to_currency}
                      </p>
                      <p>
                        <span className="font-medium">Tasa:</span> {formatCurrency(transaction.exchange_rate)}
                      </p>
                      <p className="flex items-center gap-1 text-green-600 font-medium">
                        <TrendingUp size={14} />
                        Ganancia: {formatCurrency(transaction.profit_amount)} {transaction.to_currency}
                        ({transaction.total_profit_percentage}%)
                      </p>
                      {transaction.description && (
                        <p className="text-gray-500 italic">{transaction.description}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        Creado el {formatDate(transaction.created_at)}
                        {transaction.creator && ` por ${transaction.creator.username}`}
                      </p>
                    </div>

                    {/* Profit Splits */}
                    {transaction.profit_splits && transaction.profit_splits.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-700 mb-2">Distribución de Ganancias:</p>
                        <div className="flex flex-wrap gap-2">
                          {transaction.profit_splits.map((split) => (
                            <span key={split.uuid} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              {split.user?.username || `Usuario ${split.user_uuid}`}: {formatCurrency(split.profit_amount)} ({split.profit_percentage}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/admin/transactions/${transaction.uuid}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Ver detalles"
                    >
                      <Eye size={18} />
                    </Link>
                    <Link
                      href={`/admin/transactions/${transaction.uuid}/edit`}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </Link>
                    <button
                      onClick={() => handleDelete(transaction.uuid)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > (filters.per_page || 20) && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <span className="text-sm text-gray-600">
            Página {page} de {Math.ceil(total / (filters.per_page || 20))}
          </span>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / (filters.per_page || 20))}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
