import React, { useState, useEffect } from 'react';
import { X, Activity, Zap, Edit3, RotateCcw, AlertCircle } from 'lucide-react';
import { Rate } from '@/types/currency';
import { adminService } from '@/services/adminService';

interface ManualRateModalProps {
  isOpen: boolean;
  rate: Rate | null;
  currencyConfig: Record<string, { name: string; symbol: string; color: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

const ManualRateModal: React.FC<ManualRateModalProps> = ({
  isOpen,
  rate,
  currencyConfig,
  onClose,
  onSuccess
}) => {
  const [manualRate, setManualRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rate) {
      setManualRate(rate.manual_rate?.toString() || rate.rate.toString());
    }
  }, [rate]);

  if (!isOpen || !rate) return null;

  const isManualMode = rate.is_manual || false;
  const currentRate = rate.rate;
  const automaticRate = rate.automatic_rate || (isManualMode ? null : currentRate);

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  };

  const getCurrencyName = (code: string) => {
    return currencyConfig[code]?.name || code.toUpperCase();
  };

  const getCurrencyColor = (code: string) => {
    return currencyConfig[code]?.color || 'bg-gray-500';
  };

  const handleSetManualRate = async () => {
    if (!rate.currency_pair_uuid) {
      setError('No se encontró el UUID del par de monedas');
      return;
    }

    const newRate = parseFloat(manualRate);
    if (isNaN(newRate) || newRate <= 0) {
      setError('Por favor ingrese un valor válido mayor a 0');
      return;
    }

    setLoading(true);
    setError('');

    const result = await adminService.setManualRate(rate.currency_pair_uuid, newRate);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Error al establecer la tasa manual');
    }
    setLoading(false);
  };

  const handleDisableManual = async () => {
    if (!rate.currency_pair_uuid) {
      setError('No se encontró el UUID del par de monedas');
      return;
    }

    setLoading(true);
    setError('');

    const result = await adminService.disableManualRate(rate.currency_pair_uuid);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Error al desactivar el modo manual');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${
          isManualMode
            ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
            : 'bg-gradient-to-r from-blue-500 to-cyan-500'
        }`}>
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              {isManualMode ? (
                <Edit3 className="text-white" size={20} />
              ) : (
                <Zap className="text-white" size={20} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isManualMode ? 'Modo Manual Activo' : 'Modo Automático'}
              </h3>
              <p className="text-white text-opacity-90 text-sm">
                Gestionar tasa de cambio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Currency Pair Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${getCurrencyColor(rate.from_currency)}`}></div>
              <span className="font-medium text-gray-900">
                {getCurrencyName(rate.from_currency)}
              </span>
              <span className="text-gray-400">→</span>
              <div className={`w-3 h-3 rounded-full ${getCurrencyColor(rate.to_currency)}`}></div>
              <span className="font-medium text-gray-900">
                {getCurrencyName(rate.to_currency)}
              </span>
            </div>
          </div>

          {/* Mode Status */}
          <div className={`border-l-4 p-4 rounded-r-lg ${
            isManualMode
              ? 'border-purple-500 bg-purple-50'
              : 'border-blue-500 bg-blue-50'
          }`}>
            <div className="flex items-start gap-3">
              <Activity className={isManualMode ? 'text-purple-600' : 'text-blue-600'} size={20} />
              <div className="flex-1">
                <p className={`font-semibold ${isManualMode ? 'text-purple-900' : 'text-blue-900'}`}>
                  Estado Actual: {isManualMode ? 'Manual' : 'Automático'}
                </p>
                <p className={`text-sm mt-1 ${isManualMode ? 'text-purple-700' : 'text-blue-700'}`}>
                  {isManualMode
                    ? 'Esta tasa está configurada manualmente y no se actualiza con el scraper.'
                    : 'Esta tasa se actualiza automáticamente desde Binance P2P.'}
                </p>
              </div>
            </div>
          </div>

          {/* Current Rates Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Tasa Actual</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(currentRate)}
              </p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                isManualMode ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isManualMode ? 'Manual' : 'Automático'}
              </span>
            </div>

            {automaticRate && isManualMode && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Tasa Automática</p>
                <p className="text-2xl font-bold text-gray-600">
                  {formatNumber(automaticRate)}
                </p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 mt-2">
                  Guardada
                </span>
              </div>
            )}
          </div>

          {/* Manual Rate Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isManualMode ? 'Actualizar Tasa Manual' : 'Establecer Tasa Manual'}
            </label>
            <input
              type="number"
              step="0.0001"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
              placeholder="Ej: 52.5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta será la tasa fija hasta que la desactives
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {isManualMode && (
              <button
                onClick={handleDisableManual}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw size={18} />
                Volver a Automático
              </button>
            )}
            <button
              onClick={handleSetManualRate}
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                isManualMode ? 'flex-1' : 'w-full'
              }`}
            >
              <Edit3 size={18} />
              {loading ? 'Guardando...' : (isManualMode ? 'Actualizar Manual' : 'Activar Modo Manual')}
            </button>
          </div>

          {/* Info Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Nota:</strong> Al activar el modo manual, el scraper automático no actualizará esta tasa.
              Puedes volver al modo automático en cualquier momento para que se sincronice nuevamente con Binance P2P.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualRateModal;
