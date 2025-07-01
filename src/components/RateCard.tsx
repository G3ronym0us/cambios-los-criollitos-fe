import React from 'react';
import { Rate, CurrencyConfig } from '@/types/currency';
import { TrendingUp, TrendingDown, ArrowRight, Edit } from 'lucide-react';

interface RateCardProps {
  rate: Rate;
  currencyConfig?: CurrencyConfig;
  showEditButton?: boolean;
  categoryName?: string;
  onEdit?: (rate: Rate) => void;
}

const RateCard: React.FC<RateCardProps> = ({ 
  rate, 
  currencyConfig = {}, 
  showEditButton = false, 
  categoryName = '',
  onEdit 
}) => {
  const { from_currency, to_currency, rate: rateValue, type, inverse_percentage } = rate;

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
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300">
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
          {/* Mostrar botón de edición solo para tasas USDT */}
          {showEditButton && (categoryName === 'USDT') && (
            <button
              onClick={handleEdit}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Editar tasa manualmente"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {type === 'buy' && <TrendingUp className="h-4 w-4 text-green-500" />}
          {type === 'sell' && <TrendingDown className="h-4 w-4 text-red-500" />}
        </div>
      </div>
      
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