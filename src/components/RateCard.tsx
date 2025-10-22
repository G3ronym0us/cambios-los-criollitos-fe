import React from 'react';
import { Rate, CurrencyConfig } from '@/types/currency';
import { TrendingUp, TrendingDown, ArrowRight, Edit, Edit3 } from 'lucide-react';

interface RateCardProps {
  rate: Rate;
  currencyConfig?: CurrencyConfig;
  showEditButton?: boolean;
  onEdit?: (rate: Rate) => void;
}

const RateCard: React.FC<RateCardProps> = ({
  rate,
  currencyConfig = {},
  showEditButton = false,
  onEdit
}) => {
  const { from_currency, to_currency, rate: rateValue, type, inverse_percentage, is_manual } = rate;

  const getCurrencyName = (code: string) => {
    return currencyConfig[code]?.name || code.toUpperCase();
  };

  const getCurrencySymbol = (code: string) => {
    return currencyConfig[code]?.symbol || '';
  };

  const getCurrencyColor = (code: string) => {
    return currencyConfig[code]?.color || 'bg-gray-500';
  };

  const formatNumber = (num: number) => {
    if (!num) {
      return '0.00';
    }
    return num.toLocaleString('es-ES', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 4 
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(rate);
    }
  };

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
      is_manual ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:border-blue-300'
    }`}>
      {/* Header del par */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getCurrencyColor(from_currency)}`}></div>
          <span className="font-medium text-gray-900 text-sm sm:text-base">
            {getCurrencyName(from_currency)}
          </span>
          <ArrowRight className="h-3 w-3 text-gray-400" />
          <div className={`w-3 h-3 rounded-full ${getCurrencyColor(to_currency)}`}></div>
          <span className="font-medium text-gray-900 text-sm sm:text-base">
            {getCurrencyName(to_currency)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mostrar botón de edición en todos los pares */}
          {showEditButton && onEdit && (
            <button
              onClick={handleEdit}
              className={`p-1 rounded transition-colors ${
                is_manual
                  ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-100'
                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title={is_manual ? "Gestionar tasa manual" : "Activar modo manual"}
            >
              {is_manual ? <Edit3 className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </button>
          )}
          {type === 'buy' && <TrendingUp className="h-4 w-4 text-green-500" />}
          {type === 'sell' && <TrendingDown className="h-4 w-4 text-red-500" />}
        </div>
      </div>

      {/* Badge de modo manual */}
      {is_manual && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Edit3 className="h-3 w-3" />
            Modo Manual
          </span>
        </div>
      )}
      
      {/* Valor */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs sm:text-sm text-gray-600">Tasa:</span>
          <span className="text-lg sm:text-xl font-bold text-gray-900">
            {formatNumber(rateValue)}
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          {inverse_percentage ? (
            <span>1 {getCurrencyName(to_currency)} = {getCurrencySymbol(from_currency)}{formatNumber(rateValue)} {getCurrencyName(from_currency)}</span>
          ) : (
            <span>1 {getCurrencyName(from_currency)} = {getCurrencySymbol(to_currency)}{formatNumber(rateValue)} {getCurrencyName(to_currency)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateCard;