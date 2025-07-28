"use client";

import { useState } from 'react';
import { X, AlertTriangle, Settings, CheckCircle } from 'lucide-react';

interface ManualRateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSetRate: (rate: number) => Promise<boolean>;
  onRemoveRate: () => Promise<boolean>;
  fromCurrency: string;
  toCurrency: string;
  currentRate?: number;
  automaticRate?: number;
  isManual?: boolean;
  isLoading?: boolean;
}

export default function ManualRateDialog({
  isOpen,
  onClose,
  onSetRate,
  onRemoveRate,
  fromCurrency,
  toCurrency,
  currentRate,
  automaticRate,
  isManual = false,
  isLoading = false
}: ManualRateDialogProps) {
  const [manualRate, setManualRate] = useState<string>(currentRate?.toString() || '');
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSetRate = async () => {
    const rate = parseFloat(manualRate);
    if (!isNaN(rate) && rate > 0) {
      const success = await onSetRate(rate);
      if (success) {
        setSuccessMessage('Precio manual establecido correctamente');
        setShowSuccess(true);
      }
    }
  };

  const handleRemoveRate = async () => {
    setShowConfirmRemove(false);
    const success = await onRemoveRate();
    if (success) {
      setSuccessMessage('Precio manual removido correctamente');
      setShowSuccess(true);
    }
  };

  const handleClose = () => {
    setShowSuccess(false);
    setSuccessMessage('');
    setShowConfirmRemove(false);
    onClose();
  };

  const isValidRate = () => {
    const rate = parseFloat(manualRate);
    return !isNaN(rate) && rate > 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="text-blue-500" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">
              Gestión de Precio Manual
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-2">
            Par: <span className="font-medium">{fromCurrency}/{toCurrency}</span>
          </div>
          
          {automaticRate && (
            <div className="text-sm text-gray-600 mb-2">
              Precio automático: <span className="font-medium">{automaticRate.toFixed(4)}</span>
            </div>
          )}
          
          {isManual && currentRate && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-yellow-600" size={16} />
                <span className="text-sm text-yellow-800">
                  Este par tiene un precio manual activo: {currentRate.toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </div>

        {showSuccess ? (
          <div className="text-center">
            <div className="mb-4">
              <CheckCircle className="text-green-500 mx-auto mb-2" size={48} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">¡Éxito!</h4>
              <p className="text-sm text-gray-600">
                {successMessage}
              </p>
            </div>
            
            <button
              onClick={handleClose}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : !showConfirmRemove ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo precio manual
              </label>
              <input
                type="number"
                step="0.0001"
                value={manualRate}
                onChange={(e) => setManualRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingrese el precio manual"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSetRate}
                disabled={!isValidRate() || isLoading}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Estableciendo...' : 'Establecer Precio'}
              </button>
              
              {isManual && (
                <button
                  onClick={() => setShowConfirmRemove(true)}
                  disabled={isLoading}
                  className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Remover
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-4">
              <AlertTriangle className="text-red-500 mx-auto mb-2" size={24} />
              <p className="text-sm text-gray-600">
                ¿Está seguro que desea remover el precio manual?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                El sistema volverá a usar el precio automático
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmRemove(false)}
                disabled={isLoading}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemoveRate}
                disabled={isLoading}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Removiendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}