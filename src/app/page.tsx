"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CurrencyCalculator from '../components/CurrencyCalculator';
import { Rate, IconProps } from '@/types/currency';

// Iconos SVG
const RefreshIcon = ({ className, spinning = false }: IconProps) => (
  <svg className={`${className} ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const SettingsIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ExchangeRatesDashboard = () => {
  const { user } = useAuth();
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Función para obtener datos del backend
  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(undefined);
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/rates');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRates(data);
    } catch (error) {
      console.error('Error fetching rates:', error);
      setError('Error al cargar las tasas de cambio');
    } finally {
      setLoading(false);
    }
  };

  // Función para refrescar datos manualmente
  const refreshData = async () => {
    await fetchRates();
  };

  // Cargar datos al iniciar
  useEffect(() => {
    fetchRates();
  }, []);

  if (loading && rates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center">
          <RefreshIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" spinning={true} />
          <p className="text-lg text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={fetchRates}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition-colors font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header compacto y moderno */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-2xl sm:text-3xl">💱</div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  Calculadora P2P
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Tasas de cambio en tiempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-all hover:shadow-md"
                title="Actualizar tasas"
              >
                <RefreshIcon className="h-5 w-5" spinning={loading} />
                <span className="hidden sm:inline font-medium">
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </span>
              </button>

              {user && (user.role === 'root' || user.role === 'moderator') && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all hover:shadow-md"
                  title="Administración"
                >
                  <SettingsIcon className="h-5 w-5" />
                  <span className="hidden lg:inline font-medium">Admin</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal - Solo calculadora */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-4xl mx-auto">
          <CurrencyCalculator rates={rates} />
        </div>
      </div>
    </div>
  );
};

export default ExchangeRatesDashboard;