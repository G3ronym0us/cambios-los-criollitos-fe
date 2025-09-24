"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CurrencyCalculator from '../components/CurrencyCalculator';
import CategorySection from '../components/CategorySection';
import { Currency, Rate, CurrencyConfig, IconProps } from '@/types/currency';

// Iconos SVG
const RefreshIcon = ({ className, spinning = false }: IconProps) => (
  <svg className={`${className} ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);


const ClockIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const XIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ExchangeRatesDashboard = () => {
  const { user } = useAuth();
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>();
  const [error, setError] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [modalForm, setModalForm] = useState({ rate: '' });

  // Configuración de monedas y sus símbolos
  const currencyConfig: CurrencyConfig = {
    [Currency.USDT]: { name: 'USDT', symbol: '$', color: 'bg-green-500', textColor: 'text-green-600' },
    [Currency.VES]: { name: 'Bolívares', symbol: 'Bs', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    [Currency.COP]: { name: 'Pesos COP', symbol: 'COL$', color: 'bg-blue-500', textColor: 'text-blue-600' },
    [Currency.BRL]: { name: 'Reales', symbol: 'R$', color: 'bg-purple-500', textColor: 'text-purple-600' },
    [Currency.ZELLE]: { name: 'Zelle', symbol: '$', color: 'bg-indigo-500', textColor: 'text-indigo-600' },
    [Currency.PAYPAL]: { name: 'PayPal', symbol: '$', color: 'bg-cyan-500', textColor: 'text-cyan-600' }
  };

  // Función para obtener datos del backend
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

  // Función para refrescar datos manualmente
  const refreshData = async () => {
    try {
      setLoading(true);
      // Intentar hacer scraping primero
      await fetch('http://localhost:8000/api/scrape', { method: 'POST' });
      await fetchRates();
    } catch (error) {
      console.error('Error refreshing data:', error);
      // Si falla el scraping, al menos intentar obtener los datos actuales
      await fetchRates();
    }
  };

  // Cargar datos al iniciar
  useEffect(() => {
    fetchRates();
  }, []);

  // Función para formatear las tasas por categorías
  const formatRatesByCategory = () => {
    
    const categories: Record<string, Rate[]> = {
      'USDT': [],
      'Zelle': [],
      'PayPal': [],
      'Conversiones Cruzadas': []
    };

    rates.forEach((rate, index) => {      
      if (rate.from_currency === Currency.USDT) {
        categories['USDT'].push({ key: index.toString(), from_currency: rate.from_currency, to_currency: rate.to_currency, rate: rate.rate, type: 'sell', inverse_percentage: rate.inverse_percentage });
      } else if (rate.to_currency === Currency.USDT) {
        categories['USDT'].push({ key: index.toString(), from_currency: rate.from_currency, to_currency: rate.to_currency, rate: rate.rate, type: 'buy', inverse_percentage: rate.inverse_percentage });
      } else if (rate.from_currency === Currency.ZELLE || rate.to_currency === Currency.ZELLE) {
        categories['Zelle'].push({ key: index.toString(), from_currency: rate.from_currency, to_currency: rate.to_currency, rate: rate.rate, type: 'sell', inverse_percentage: rate.inverse_percentage });
      } else if (rate.from_currency === Currency.PAYPAL || rate.to_currency === Currency.PAYPAL) {
        categories['PayPal'].push({ key: index.toString(), from_currency: rate.from_currency, to_currency: rate.to_currency, rate: rate.rate, type: 'sell', inverse_percentage: rate.inverse_percentage });
      } else {
        categories['Conversiones Cruzadas'].push({ key: index.toString(), from_currency: rate.from_currency, to_currency: rate.to_currency, rate: rate.rate, type: 'cross', inverse_percentage: rate.inverse_percentage });
      }
    });

    return categories;
  };

  // Función para formatear números
  const formatNumber = (num: number) => {
    if (!num) {
      return '0.00';
    }
    return num.toLocaleString('es-ES', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 4 
    });
  };

  // Función para obtener el nombre completo de la moneda
  const getCurrencyName = (code: string) => {
    return currencyConfig[code]?.name || code.toUpperCase();
  };


  // Función para obtener color de la moneda
  const getCurrencyColor = (code: string) => {
    return currencyConfig[code]?.color || 'bg-gray-500';
  };

  // Función para abrir modal de edición
  const handleEditRate = (rate: Rate) => {
    setEditingRate(rate);
    setModalForm({ rate: rate.rate.toString() });
    setIsModalOpen(true);
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


  const categorizedRates = formatRatesByCategory();

  if (loading && Object.keys(rates).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" spinning={true} />
          <p className="text-xl text-gray-600">Cargando tasas de cambio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={fetchRates}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            💱 Tasas de Cambio P2P
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Tasas actualizadas desde Binance P2P
          </p>
          
          {/* Controles */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
            >
              <RefreshIcon className="h-4 w-4" spinning={loading} />
              {loading ? 'Actualizando...' : 'Actualizar Tasas'}
            </button>
            
            {user && (user.role === 'ROOT' || user.role === 'MODERATOR') && (
              <Link
                href="/admin"
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
              >
                Administración
              </Link>
            )}
            
            {lastUpdate && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <ClockIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Última actualización:</span>
                <span className="sm:hidden">Actualizado:</span>
                <span className="font-medium">{lastUpdate}</span>
              </div>
            )}
          </div>
        </div>

        <CurrencyCalculator rates={rates} />

        {/* Tasas por categorías */}
        <div className="space-y-6">
          {Object.entries(categorizedRates).map(([categoryName, categoryRates]) => (
            <CategorySection
              key={categoryName}
              categoryName={categoryName}
              categoryRates={categoryRates}
              currencyConfig={currencyConfig}
              showEditButton={true}
              onEditRate={handleEditRate}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>© 2024 Sistema de Tasas P2P | Datos desde Binance P2P API</p>
        </div>
      </div>

      {/* Modal para editar tasa */}
      {isModalOpen && editingRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                <XIcon className="h-6 w-6" />
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
                  <ArrowRightIcon className="h-3 w-3 text-gray-400" />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
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

export default ExchangeRatesDashboard;