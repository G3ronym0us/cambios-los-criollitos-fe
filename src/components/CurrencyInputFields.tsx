import React from 'react';

interface CurrencyConfig {
  [key: string]: {
    name: string;
    symbol: string;
    color: string;
    bgColor: string;
  };
}

interface CurrencyInputFieldsProps {
  fromAmount?: string;
  toAmount?: string;
  fromCurrency: string;
  toCurrency: string;
  onFromAmountChange: (value: string) => void;
  onToAmountChange: (value: string) => void;
  bcvRate?: number;
  bcvAmount?: string;
  onBCVAmountChange?: (value: string) => void;
}

const CurrencyInputFields: React.FC<CurrencyInputFieldsProps> = ({
  fromAmount,
  toAmount,
  fromCurrency,
  toCurrency,
  onFromAmountChange,
  onToAmountChange,
  bcvRate,
  bcvAmount,
  onBCVAmountChange
}) => {
  const currencyConfig: CurrencyConfig = {
    'USDT': { name: 'USDT', symbol: '$', color: 'text-green-700', bgColor: 'bg-green-100 border-green-300' },
    'VES': { name: 'Bolívares', symbol: 'Bs', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-300' },
    'COP': { name: 'Pesos COP', symbol: 'COL$', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
    'BRL': { name: 'Reales', symbol: 'R$', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-300' },
    'ZELLE': { name: 'Zelle', symbol: '$', color: 'text-indigo-700', bgColor: 'bg-indigo-100 border-indigo-300' },
    'PAYPAL': { name: 'PayPal', symbol: '$', color: 'text-cyan-700', bgColor: 'bg-cyan-100 border-cyan-300' }
  };

  const getCurrencyName = (code: string) => {
    return currencyConfig[code]?.name || code.toUpperCase();
  };

  const getCurrencySymbol = (code: string) => {
    return currencyConfig[code]?.symbol || '';
  };

  const getCurrencyColor = (code: string) => {
    return currencyConfig[code]?.color || 'text-gray-700';
  };

  const getCurrencyBgColor = (code: string) => {
    return currencyConfig[code]?.bgColor || 'bg-gray-100 border-gray-300';
  };

  // Determinar si mostrar campo BCV
  const shouldShowBCVField = bcvRate && (fromCurrency === 'VES' || toCurrency === 'VES');

  if (!fromCurrency || !toCurrency) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Selecciona las monedas para comenzar a calcular</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Campo FROM */}
        <div className={`p-4 rounded-lg border-2 ${getCurrencyBgColor(fromCurrency)} transition-all hover:shadow-md`}>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-sm font-medium ${getCurrencyColor(fromCurrency)}`}>
              {getCurrencyName(fromCurrency)}
            </label>
            <span className={`text-xs font-medium ${getCurrencyColor(fromCurrency)} px-2 py-1 rounded-full bg-white bg-opacity-50`}>
              {getCurrencySymbol(fromCurrency)}
            </span>
          </div>
          <input
            type="number" 
            value={Number(fromAmount).toFixed(Math.min(Math.max(0, (fromAmount?.toString().split('.')[1] || '').length), 2))}
            onChange={(e) => onFromAmountChange(e.target.value)}
            className="w-full text-2xl font-bold bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-400 text-black"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        {/* Campo TO */}
        <div className={`p-4 rounded-lg border-2 ${getCurrencyBgColor(toCurrency)} transition-all hover:shadow-md`}>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-sm font-medium ${getCurrencyColor(toCurrency)}`}>
              {getCurrencyName(toCurrency)}
            </label>
            <span className={`text-xs font-medium ${getCurrencyColor(toCurrency)} px-2 py-1 rounded-full bg-white bg-opacity-50`}>
              {getCurrencySymbol(toCurrency)}
            </span>
          </div>
          <input
            type="number"
            value={Number(toAmount).toFixed(Math.min(Math.max(0, (toAmount?.toString().split('.')[1] || '').length), 2))}
            onChange={(e) => onToAmountChange(e.target.value)}
            className="w-full text-2xl font-bold bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-400 text-black"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Campo BCV (solo cuando hay VES involucrado) */}
      {shouldShowBCVField && (
        <div className="p-4 rounded-lg border-2 bg-blue-100 border-blue-300 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-blue-700">
              Equivalente en $BCV
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600">
                1 BCV = {bcvRate?.toFixed(2)} VES
              </span>
              <span className="text-xs font-medium text-blue-700 px-2 py-1 rounded-full bg-white bg-opacity-50">
                $BCV
              </span>
            </div>
          </div>
          <input
            type="number"
            value={Number(bcvAmount).toFixed(Math.min(Math.max(0, (bcvAmount?.toString().split('.')[1] || '').length), 2))}
            onChange={(e) => {
              if (onBCVAmountChange) {
                onBCVAmountChange(e.target.value);
              }
            }}
            className="w-full text-2xl font-bold bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-400 text-black"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      )}
    </div>
  );
};

export default CurrencyInputFields;