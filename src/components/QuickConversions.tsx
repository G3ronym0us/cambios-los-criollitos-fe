import React from 'react';

interface QuickConversionsProps {
  availableCurrencies: string[];
  onQuickConversion: (from: string, to: string, amount: string) => void;
}

const QuickConversions: React.FC<QuickConversionsProps> = ({
  availableCurrencies,
  onQuickConversion
}) => {
  const quickOptions = [
    { from: "USDT", to: "VES", amount: "100", label: "100 USDT → VES" },
    { from: "USDT", to: "COP", amount: "100", label: "100 USDT → COP" },
    { from: "USDT", to: "BRL", amount: "100", label: "100 USDT → BRL" },
    { from: "ZELLE", to: "VES", amount: "100", label: "100 Zelle → VES" },
    { from: "PAYPAL", to: "VES", amount: "100", label: "100 PayPal → VES" },
    { from: "VES", to: "COP", amount: "1000", label: "1000 VES → COP" },
    { from: "VES", to: "BRL", amount: "1000", label: "1000 VES → BRL" },
    { from: "COP", to: "VES", amount: "10000", label: "10000 COP → VES" }
  ];

  const filteredOptions = quickOptions.filter(option => 
    availableCurrencies.includes(option.from) && availableCurrencies.includes(option.to)
  );

  if (filteredOptions.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Conversiones populares:
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {filteredOptions.map((option, index) => (
          <button
            key={index}
            onClick={() => onQuickConversion(option.from, option.to, option.amount)}
            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center border border-gray-200 hover:border-gray-300"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickConversions;