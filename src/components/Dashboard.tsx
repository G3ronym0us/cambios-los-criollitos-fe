"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Currency, Rate, CurrencyConfig } from '@/types/currency';
import { LogOut, RefreshCw, Clock, X, ArrowRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>();
  const [error, setError] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [modalForm, setModalForm] = useState({ rate: '' });

  const currencyConfig: CurrencyConfig = {
    [Currency.USDT]: { name: 'USDT', symbol: '$', color: 'bg-green-500', textColor: 'text-green-600' },
    [Currency.VES]: { name: 'Bolívares', symbol: 'Bs', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    [Currency.COP]: { name: 'Pesos COP', symbol: 'COL$', color: 'bg-blue-500', textColor: 'text-blue-600' },
    [Currency.BRL]: { name: 'Reales', symbol: 'R$', color: 'bg-purple-500', textColor: 'text-purple-600' },
    [Currency.ZELLE]: { name: 'Zelle', symbol: '$', color: 'bg-indigo-500', textColor: 'text-indigo-600' },
    [Currency.PAYPAL]: { name: 'PayPal', symbol: '$', color: 'bg-cyan-500', textColor: 'text-cyan-600' }
  };

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(undefined);
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/rates');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setRates(data);
      setLastUpdate(new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    } catch (error) {
      console.error('Error fetching rates:', error);
      setError('Error al cargar las tasas de cambio');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      await fetch('http://localhost:8000/api/scrape', { method: 'POST' });
      await fetchRates();
    } catch (error) {
      console.error('Error refreshing data:', error);
      await fetchRates();
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    if (!num) {
      return '0.00';
    }
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

  // Función para cerrar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRate(null);
    setModalForm({ rate: '' });
  };

  // Función para guardar cambios
  const handleSaveRate = () => {
    if (!editingRate) return;
    
    const newRate = parseFloat(modalForm.rate);
    if (isNaN(newRate) || newRate <= 0) {
      alert('Por favor ingrese un valor válido');
      return;
    }

    // Actualizar la tasa en el estado local
    setRates(prevRates => 
      prevRates.map(rate => 
        rate.key === editingRate.key 
          ? { ...rate, rate: newRate }
          : rate
      )
    );

    handleCloseModal();
  };


  if (loading && Object.keys(rates).length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-xl text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={fetchRates}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header con información del admin */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Cambios Los Criollitos" width={48} height={48} className="shrink-0" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Cambios Los Criollitos
                </h1>
                <p className="text-gray-600">
                  Bienvenido, {user?.full_name} | {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Tasas de Cambio P2P
              </h2>
              <p className="text-gray-600">
                Datos actualizados desde Binance P2P
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Actualizando...' : 'Actualizar Tasas'}
              </button>
              
              {lastUpdate && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Última actualización:</span>
                  <span className="sm:hidden">Actualizado:</span>
                  <span className="font-medium">{lastUpdate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        

        {/* Footer */}
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>© 2024 Sistema de Tasas P2P | Panel de Administración</p>
        </div>
      </div>

      {/* Modal para editar tasa */}
      {isModalOpen && editingRate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Tasa Manualmente
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-4">
              {/* Información del par */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getCurrencyColor(editingRate.from_currency)}`}></div>
                  <span className="font-medium text-gray-900">
                    {getCurrencyName(editingRate.from_currency)}
                  </span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <div className={`w-3 h-3 rounded-full ${getCurrencyColor(editingRate.to_currency)}`}></div>
                  <span className="font-medium text-gray-900">
                    {getCurrencyName(editingRate.to_currency)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Tasa actual: <span className="font-medium">{formatNumber(editingRate.rate)}</span>
                </p>
              </div>

              {/* Input para nueva tasa */}
              <div>
                <label htmlFor="newRate" className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Tasa
                </label>
                <input
                  id="newRate"
                  type="number"
                  step="0.0001"
                  value={modalForm.rate}
                  onChange={(e) => setModalForm({ rate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Ingrese la nueva tasa"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveRate}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};