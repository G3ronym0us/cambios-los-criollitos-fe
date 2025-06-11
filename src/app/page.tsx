"use client";

import React, { useState, useEffect } from 'react';

// Iconos SVG
const RefreshIcon = ({ className, spinning = false }: { className: string, spinning: boolean }) => (
  <svg className={`${className} ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const TrendingUpIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17h8m0 0l-4 4m4-4l-4-4M3 7h8m0 0L7 3m4 4L7 11" />
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

interface Rate {
  key: string;
  from: string;
  to: string;
  value: number;
  type: string;
}

interface CurrencyConfig {
  [key: string]: {
    name: string;
    symbol: string;
    color: string;
    textColor: string;
  };
}

const ExchangeRatesDashboard = () => {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>();
  const [error, setError] = useState<string>();

  // Configuración de monedas y sus símbolos
  const currencyConfig: CurrencyConfig = {
    'usdt': { name: 'USDT', symbol: '$', color: 'bg-green-500', textColor: 'text-green-600' },
    'ves': { name: 'Bolívares', symbol: 'Bs', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    'cop': { name: 'Pesos COP', symbol: 'COL$', color: 'bg-blue-500', textColor: 'text-blue-600' },
    'brl': { name: 'Reales', symbol: 'R$', color: 'bg-purple-500', textColor: 'text-purple-600' },
    'zelle': { name: 'Zelle', symbol: '$', color: 'bg-indigo-500', textColor: 'text-indigo-600' },
    'paypal': { name: 'PayPal', symbol: '$', color: 'bg-cyan-500', textColor: 'text-cyan-600' }
  };

  // Función para obtener datos del backend
  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(undefined);
      const response = await fetch('http://localhost:8000/api/rates');
      
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
    // Refrescar cada 2 minutos
    const interval = setInterval(fetchRates, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Función para formatear las tasas por categorías
  const formatRatesByCategory = () => {
    
    const categories: Record<string, Rate[]> = {
      'USDT': [],
      'Zelle': [],
      'PayPal': [],
      'Conversiones Cruzadas': []
    };

    Object.entries(rates).forEach(([key, value]) => {
      const [from, , to] = key.split('_');
      
      if (from === 'usdt') {
        categories['USDT'].push({ key, from, to, value, type: 'sell' });
      } else if (to === 'usdt') {
        categories['USDT'].push({ key, from, to, value, type: 'buy' });
      } else if (from === 'zelle') {
        categories['Zelle'].push({ key, from, to, value, type: 'sell' });
      } else if (from === 'paypal') {
        categories['PayPal'].push({ key, from, to, value, type: 'sell' });
      } else {
        categories['Conversiones Cruzadas'].push({ key, from, to, value, type: 'cross' });
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

  // Función para obtener el símbolo de la moneda
  const getCurrencySymbol = (code: string) => {
    return currencyConfig[code]?.symbol || '';
  };

  // Función para obtener color de la moneda
  const getCurrencyColor = (code: string) => {
    return currencyConfig[code]?.color || 'bg-gray-500';
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

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100">
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{Object.keys(rates).length}</div>
            <div className="text-xs sm:text-sm text-gray-600">Tasas Totales</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{rates.usdt_to_ves ? formatNumber(rates.usdt_to_ves) : 'N/A'}</div>
            <div className="text-xs sm:text-sm text-gray-600">USDT → VES</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{rates.usdt_to_cop ? formatNumber(rates.usdt_to_cop) : 'N/A'}</div>
            <div className="text-xs sm:text-sm text-gray-600">USDT → COP</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">{rates.usdt_to_brl ? formatNumber(rates.usdt_to_brl) : 'N/A'}</div>
            <div className="text-xs sm:text-sm text-gray-600">USDT → BRL</div>
          </div>
        </div>

        {/* Tasas por categorías */}
        <div className="space-y-6">
          {Object.entries(categorizedRates).map(([categoryName, categoryRates]) => {
            if (categoryRates.length === 0) return null;
            
            return (
              <div key={categoryName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header de categoría */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-4 sm:px-6 py-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">{categoryName}</h2>
                  <p className="text-gray-300 text-sm">{categoryRates.length} pares disponibles</p>
                </div>

                {/* Grid de tasas */}
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryRates.map(({ key, from, to, value, type }) => (
                      <div key={key} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                        {/* Header del par */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getCurrencyColor(from)}`}></div>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">
                              {getCurrencyName(from)}
                            </span>
                            <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                            <div className={`w-3 h-3 rounded-full ${getCurrencyColor(to)}`}></div>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">
                              {getCurrencyName(to)}
                            </span>
                          </div>
                          
                          {type === 'buy' && <TrendingUpIcon className="h-4 w-4 text-green-500" />}
                          {type === 'sell' && <TrendingDownIcon className="h-4 w-4 text-red-500" />}
                        </div>
                        
                        {/* Valor */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-gray-600">Tasa:</span>
                            <span className="text-lg sm:text-xl font-bold text-gray-900">
                              {formatNumber(value)}
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            1 {getCurrencyName(from)} = {getCurrencySymbol(to)}{formatNumber(value)} {getCurrencyName(to)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>© 2024 Sistema de Tasas P2P | Datos desde Binance P2P API</p>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRatesDashboard;