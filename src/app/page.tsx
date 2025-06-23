"use client";

import React, { useState, useEffect } from 'react';
import CurrencyCalculator from '../components/CurrencyCalculator';

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

enum Currency {
  VES = "VES",
  COP = "COP",
  BRL = "BRL",
  USDT = "USDT",
  ZELLE = "ZELLE",
  PAYPAL = "PAYPAL",
}

interface Rate {
  key: string;
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  type: string;
  inverse_percentage: boolean;
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
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>();
  const [error, setError] = useState<string>();

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

        <CurrencyCalculator rates={rates} />

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
                    {categoryRates.map(({ key, from_currency, to_currency, rate, type, inverse_percentage }) => (
                      <div key={key} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                        {/* Header del par */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getCurrencyColor(from_currency)}`}></div>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">
                              {getCurrencyName(from_currency)}
                            </span>
                            <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                            <div className={`w-3 h-3 rounded-full ${getCurrencyColor(to_currency)}`}></div>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">
                              {getCurrencyName(to_currency)}
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
                              {formatNumber(rate)}
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                              {inverse_percentage ? <span>1 {getCurrencyName(to_currency)} = {getCurrencySymbol(from_currency)}{formatNumber(rate)} {getCurrencyName(from_currency)}</span> : <span>1 {getCurrencyName(from_currency)} = {getCurrencySymbol(to_currency)}{formatNumber(rate)} {getCurrencyName(to_currency)}</span>}
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