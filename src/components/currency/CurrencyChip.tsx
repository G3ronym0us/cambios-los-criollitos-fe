import React from "react";
import { getCurrencySymbol, getCurrencyColor } from "@/utils/currencyConfig";

const ChevronDownIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

interface CurrencyChipProps {
  currency: string;
  label: "De" | "A";
  onClick: () => void;
  isPlaceholder?: boolean;
}

const CurrencyChip: React.FC<CurrencyChipProps> = ({
  currency,
  label,
  onClick,
  isPlaceholder = false,
}) => {
  if (isPlaceholder) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-lg shadow-sm border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
      >
        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-gray-400 text-sm">?</span>
        </div>
        <div className="hidden sm:block">
          <p className="text-[10px] text-gray-400 leading-none">{label}</p>
          <p className="text-xs font-medium text-gray-400">Seleccionar</p>
        </div>
        <span className="sm:hidden text-xs font-medium text-gray-400">Moneda</span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
    >
      <div
        className={`w-7 h-7 ${getCurrencyColor(currency)} rounded-full flex items-center justify-center flex-shrink-0`}
      >
        <span className="text-white text-xs font-bold">
          {getCurrencySymbol(currency)}
        </span>
      </div>
      <div className="hidden sm:block">
        <p className="text-[10px] text-gray-500 leading-none">{label}</p>
        <p className="text-xs font-semibold text-gray-900">{currency}</p>
      </div>
      <span className="sm:hidden text-xs font-semibold text-gray-900">
        {currency}
      </span>
      <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
    </button>
  );
};

export default CurrencyChip;
