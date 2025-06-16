import React from 'react';

interface CurrencyConfig {
  [key: string]: {
    name: string;
    symbol: string;
  };
}

interface RateDisplayProps {
  rate: number | null;
  fromCurrency: string;
  toCurrency: string;
}

const RateDisplay: React.FC<RateDisplayProps> = ({
  rate,
  fromCurrency,
  toCurrency
}) => {
  const currencyConfig: CurrencyConfig = {
    'USDT': { name: 'USDT', symbol: '$' },
    'VES': { name: 'Bolívares', symbol: 'Bs' },
    'COP': { name: 'Pesos COP', symbol: 'COL$' },
    'BRL': { name: 'Reales', symbol: 'R$' },
    'ZELLE': { name: 'Zelle', symbol: '$' },
    'PAYPAL': { name: 'PayPal', symbol: '$' }
  };

  const getCurrencyName = (code: string) => {
    return currencyConfig[code]?.name || code.toUpperCase();
  };

  const formatNumber = (num: number) => {
    if (!num) return '0.00';
    return num.toLocaleString('es-ES', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
  };

  if (!rate || !fromCurrency || !toCurrency) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-1">
          Tasa de cambio actual
        </div>
        <div className="text-lg font-semibold text-gray-800">
          1 {getCurrencyName(fromCurrency)} = {formatNumber(rate)} {getCurrencyName(toCurrency)}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          1 {getCurrencyName(toCurrency)} = {formatNumber(1 / rate)} {getCurrencyName(fromCurrency)}
        </div>
      </div>
    </div>
  );
};

export default RateDisplay;