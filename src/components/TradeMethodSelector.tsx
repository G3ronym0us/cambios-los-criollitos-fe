"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { AdminService } from '@/services/adminService';
import { BinanceTradeMethod } from '@/types/admin';

interface TradeMethodSelectorProps {
  selectedMethods: string[];
  onChange: (methods: string[]) => void;
  fiatCurrency: string;
  className?: string;
  disabled?: boolean;
}

const adminService = new AdminService();

export default function TradeMethodSelector({ 
  selectedMethods, 
  onChange, 
  fiatCurrency,
  className = "",
  disabled = false 
}: TradeMethodSelectorProps) {
  const [availableMethods, setAvailableMethods] = useState<BinanceTradeMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (fiatCurrency) {
      fetchTradeMethods();
    } else {
      setAvailableMethods([]);
    }
  }, [fiatCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTradeMethods = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await adminService.getBinanceTradeMethodsByUrl(fiatCurrency);
      if (result.success && result.data) {
        setAvailableMethods(result.data);
      } else {
        setError(result.error || 'Error al cargar métodos de pago');
        setAvailableMethods([]);
      }
    } catch {
      setError('Error de conexión');
      setAvailableMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const addMethod = (method: BinanceTradeMethod) => {
    if (!selectedMethods.includes(method.identifier)) {
      onChange([...selectedMethods, method.identifier]);
    }
    setShowDropdown(false);
  };

  const removeMethod = (methodToRemove: string) => {
    onChange(selectedMethods.filter(method => method !== methodToRemove));
  };

  const getMethodInfo = (identifier: string): BinanceTradeMethod | undefined => {
    return availableMethods.find(method => method.identifier === identifier);
  };

  const getAvailableOptions = () => {
    return availableMethods.filter(method => !selectedMethods.includes(method.identifier));
  };

  if (loading) {
    return (
      <div className={`border border-gray-300 rounded-md p-3 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="animate-spin mr-2" size={16} />
          <span className="text-sm text-gray-500">Cargando métodos de pago...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`border border-red-300 rounded-md p-3 bg-red-50 ${className}`}>
        <div className="text-red-600 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchTradeMethods}
            className="text-red-700 hover:text-red-900 underline text-xs"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-md p-2 ${className}`}>
      {/* Selected Methods Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedMethods.map((methodId) => {
          const methodInfo = getMethodInfo(methodId);
          return (
            <span
              key={methodId}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm flex items-center gap-2"
            >
              {methodInfo?.icon_url && (
                <img 
                  src={methodInfo.icon_url} 
                  alt={methodInfo.identifier}
                  className="w-4 h-4 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span>{methodInfo?.short_name || methodInfo?.name || methodId}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeMethod(methodId)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          );
        })}
      </div>

      {/* Add Method Dropdown */}
      {!disabled && getAvailableOptions().length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            <Plus size={14} />
            Agregar método de pago
          </button>

          {showDropdown && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowDropdown(false)}
              />
              
              {/* Dropdown */}
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                {getAvailableOptions().map((method) => (
                  <button
                    key={method.identifier}
                    type="button"
                    onClick={() => addMethod(method)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    {method.icon_url && (
                      <img 
                        src={method.icon_url} 
                        alt={method.identifier}
                        className="w-5 h-5 rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <div className="font-medium">{method.short_name || method.name || method.identifier}</div>
                      {method.name && method.short_name && method.name !== method.short_name && (
                        <div className="text-xs text-gray-500">{method.name}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* No methods available message */}
      {!disabled && getAvailableOptions().length === 0 && selectedMethods.length === 0 && (
        <div className="text-sm text-gray-500 py-2">
          No hay métodos de pago disponibles para {fiatCurrency}
        </div>
      )}

      {/* All methods selected message */}
      {!disabled && getAvailableOptions().length === 0 && selectedMethods.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          Todos los métodos disponibles han sido seleccionados
        </div>
      )}
    </div>
  );
}