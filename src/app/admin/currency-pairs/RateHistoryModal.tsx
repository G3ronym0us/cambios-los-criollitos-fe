import React, { useState, useEffect, useCallback } from 'react';
import { ExchangeRateResponse } from '@/types/currency';
import { ratesService } from '@/services/ratesService';

const XIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ClockIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendingUpIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const DatabaseIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const SettingsIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const RobotIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

interface RateHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromCurrency: string;
  toCurrency: string;
  pairDisplayName: string;
}

const RateHistoryModal: React.FC<RateHistoryModalProps> = ({
  isOpen,
  onClose,
  fromCurrency,
  toCurrency,
  pairDisplayName
}) => {
  const [rates, setRates] = useState<ExchangeRateResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  const fetchRateHistory = useCallback(async () => {
    if (!fromCurrency || !toCurrency) return;

    setLoading(true);
    setError(null);

    try {
      const response = await ratesService.getLatestRatesByCurrencies(
        fromCurrency,
        toCurrency,
        limit
      );

      if (response.success && response.data) {
        setRates(response.data);
      } else {
        setError(response.error || 'Error al cargar el historial de tasas');
      }
    } catch {
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, [fromCurrency, toCurrency, limit]);

  useEffect(() => {
    if (isOpen && fromCurrency && toCurrency) {
      fetchRateHistory();
    }
  }, [isOpen, fromCurrency, toCurrency, limit, fetchRateHistory]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const formatDate = (dateString: string) => {
    return ratesService.formatRateDate(dateString);
  };

  const getCurrencyName = (code: string) => {
    return code.toUpperCase();
  };

  const getCurrencySymbol = (code: string) => {
    return code === 'USDT' ? '$' : code === 'VES' ? 'Bs' : code === 'COP' ? 'COL$' : code === 'BRL' ? 'R$' : '$';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'binance_p2p':
        return <DatabaseIcon className="h-4 w-4 text-green-600" />;
      case 'binance_p2p_derived':
        return <DatabaseIcon className="h-4 w-4 text-blue-600" />;
      case 'binance_p2p_cross':
        return <DatabaseIcon className="h-4 w-4 text-purple-600" />;
      case 'manual':
        return <DatabaseIcon className="h-4 w-4 text-orange-600" />;
      default:
        return <DatabaseIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'binance_p2p':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'binance_p2p_derived':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'binance_p2p_cross':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manual':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRateTrend = (index: number): 'up' | 'down' | 'neutral' => {
    if (index === rates.length - 1) return 'neutral';
    const currentRate = rates[index].rate;
    const previousRate = rates[index + 1].rate;
    if (currentRate > previousRate) return 'up';
    if (currentRate < previousRate) return 'down';
    return 'neutral';
  };

  const calculatePercentageDifference = (manualRate: number, automaticRate: number): { percentage: number; isHigher: boolean } => {
    const difference = ((manualRate - automaticRate) / automaticRate) * 100;
    return {
      percentage: Math.abs(difference),
      isHigher: difference > 0
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-lg">
                {pairDisplayName}
              </span>
              <span className="text-gray-500 text-sm">
                ({getCurrencyName(fromCurrency)} → {getCurrencyName(toCurrency)})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 registros</option>
              <option value={10}>10 registros</option>
              <option value={20}>20 registros</option>
              <option value={50}>50 registros</option>
              <option value={100}>100 registros</option>
            </select>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando historial...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchRateHistory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && rates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <DatabaseIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No se encontraron registros para este par de monedas</p>
            </div>
          )}

          {!loading && !error && rates.length > 0 && (
            <div className="space-y-3">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Tasa Actual</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(rates[0]?.rate)} {getCurrencySymbol(toCurrency)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Tasa Más Alta</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatNumber(Math.max(...rates.map(r => r.rate)))} {getCurrencySymbol(toCurrency)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Tasa Más Baja</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatNumber(Math.min(...rates.map(r => r.rate)))} {getCurrencySymbol(toCurrency)}
                  </p>
                </div>
              </div>

              {/* Rate History List */}
              <div className="space-y-2">
                {rates.map((rate, index) => {
                  const trend = getRateTrend(index);
                  return (
                    <div
                      key={rate.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {trend === 'up' && <TrendingUpIcon className="h-4 w-4 text-green-600" />}
                            {trend === 'down' && <TrendingDownIcon className="h-4 w-4 text-red-600" />}
                            {trend === 'neutral' && <div className="w-4 h-4" />}
                            <span className="text-xl font-bold text-gray-900">
                              {formatNumber(rate.rate)}
                            </span>
                            <span className="text-gray-600">{getCurrencySymbol(toCurrency)}</span>
                          </div>
                          
                          <div className={`px-2 py-1 rounded-full text-xs border ${getSourceColor(rate.source)}`}>
                            <div className="flex items-center gap-1">
                              {getSourceIcon(rate.source)}
                              {rate.source.replace('_', ' ').toUpperCase()}
                            </div>
                          </div>

                          {rate.percentage && (
                            <div className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 border border-yellow-200">
                              {rate.inverse_percentage ? '-' : '+'}{rate.percentage}%
                            </div>
                          )}
                        </div>

                        {/* Show both manual and automatic rates when manual is active */}
                        {rate.is_manual && rate.manual_rate && rate.automatic_rate && (() => {
                          const { percentage, isHigher } = calculatePercentageDifference(rate.manual_rate, rate.automatic_rate);
                          return (
                            <div className="ml-6 flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-2">
                                <SettingsIcon className="h-3 w-3 text-orange-600" />
                                <span className="text-orange-700 font-medium">Manual:</span>
                                <span className="font-semibold text-orange-800">
                                  {formatNumber(rate.manual_rate)} {getCurrencySymbol(toCurrency)}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800 border border-orange-200 font-medium">
                                  ACTIVO
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  isHigher 
                                    ? 'bg-red-100 text-red-800 border border-red-200' 
                                    : 'bg-green-100 text-green-800 border border-green-200'
                                }`}>
                                  {isHigher ? '+' : '-'}{percentage.toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <RobotIcon className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-600 font-medium">Automático:</span>
                                <span className="text-gray-700">
                                  {formatNumber(rate.automatic_rate)} {getCurrencySymbol(toCurrency)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {formatDate(rate.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateHistoryModal;