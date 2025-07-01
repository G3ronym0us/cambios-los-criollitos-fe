import React from 'react';
import { Rate, CurrencyConfig } from '@/types/currency';
import RateCard from './RateCard';

interface CategorySectionProps {
  categoryName: string;
  categoryRates: Rate[];
  currencyConfig?: CurrencyConfig;
  showEditButton?: boolean;
  onEditRate?: (rate: Rate) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({ 
  categoryName, 
  categoryRates, 
  currencyConfig = {},
  showEditButton = false,
  onEditRate 
}) => {
  if (categoryRates.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header de categoría */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-4 sm:px-6 py-4">
        <h2 className="text-lg sm:text-xl font-bold text-white">{categoryName}</h2>
        <p className="text-gray-300 text-sm">{categoryRates.length} pares disponibles</p>
      </div>

      {/* Grid de tasas */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryRates.map((rate) => (
            <RateCard
              key={rate.key}
              rate={rate}
              currencyConfig={currencyConfig}
              showEditButton={showEditButton}
              categoryName={categoryName}
              onEdit={onEditRate}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategorySection;