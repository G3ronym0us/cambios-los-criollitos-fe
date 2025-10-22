import React from 'react';
import { AlertTriangle, X, Clock, DollarSign, TrendingUp, Users } from 'lucide-react';
import { TransactionData } from '@/types/transaction';

interface SimilarTransactionModalProps {
  isOpen: boolean;
  similarTransaction: TransactionData;
  onConfirm: () => void;
  onCancel: () => void;
}

const SimilarTransactionModal: React.FC<SimilarTransactionModalProps> = ({
  isOpen,
  similarTransaction,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <AlertTriangle className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Transacción Similar Detectada
              </h3>
              <p className="text-amber-50 text-sm">
                Se encontró una transacción con características similares
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <p className="text-amber-900 font-medium">
              Ya existe una transacción similar creada hoy. Por favor, revisa los detalles antes de continuar.
            </p>
          </div>

          {/* Transaction Details Card */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign size={18} />
                Detalles de la Transacción Existente
              </h4>
            </div>

            <div className="p-4 space-y-4">
              {/* Pair and Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Par de Monedas</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {similarTransaction.pair_symbol}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Creada el</p>
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <Clock size={14} className="text-gray-400" />
                    {formatDate(similarTransaction.created_at)}
                  </div>
                </div>
              </div>

              {/* Conversion Details */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Monto Origen</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(similarTransaction.from_amount)} {similarTransaction.from_currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Monto Destino</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(similarTransaction.to_amount)} {similarTransaction.to_currency}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Tasa de Cambio</p>
                  <p className="text-md font-semibold text-gray-700">
                    {formatCurrency(similarTransaction.exchange_rate)}
                  </p>
                </div>
              </div>

              {/* Profit Information */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-green-600" />
                  <p className="text-sm font-semibold text-green-900">Ganancia</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(similarTransaction.profit_amount)} {similarTransaction.to_currency}
                  </p>
                  <span className="text-sm text-green-600">
                    ({similarTransaction.total_profit_percentage}%)
                  </span>
                </div>
              </div>

              {/* Profit Splits */}
              {similarTransaction.profit_splits && similarTransaction.profit_splits.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-gray-600" />
                    <p className="text-sm font-semibold text-gray-900">Distribución de Ganancias</p>
                  </div>
                  <div className="space-y-2">
                    {similarTransaction.profit_splits.map((split, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-xs">
                              {split.user?.username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {split.user?.username || `Usuario ${split.user_uuid.substring(0, 8)}`}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-700">
                            {formatCurrency(split.profit_amount)} {similarTransaction.to_currency}
                          </p>
                          <p className="text-xs text-blue-600">
                            {split.profit_percentage}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description if exists */}
              {similarTransaction.description && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-500 mb-1">Descripción</p>
                  <p className="text-sm text-gray-700 italic">
                    &ldquo;{similarTransaction.description}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
            >
              Crear de Todos Modos
            </button>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Nota:</strong> Si continúas, se creará una nueva transacción a pesar de la similitud detectada.
              Asegúrate de que no se trate de un duplicado accidental.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarTransactionModal;
