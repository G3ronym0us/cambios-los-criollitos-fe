import React, { useEffect, useRef } from "react";
import {
  getCurrencyName,
  getCurrencySymbol,
  getCurrencyColor,
} from "@/utils/currencyConfig";

interface CurrencyDropdownProps {
  isOpen: boolean;
  currencies: string[];
  selectedCurrency?: string;
  onSelect: (currency: string) => void;
  onClose: () => void;
  title: string;
}

const CurrencyDropdown: React.FC<CurrencyDropdownProps> = ({
  isOpen,
  currencies,
  selectedCurrency,
  onSelect,
  onClose,
  title,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Dropdown Panel - Slide up from bottom */}
      <div
        ref={dropdownRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out animate-slide-up max-h-[70vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Lista de monedas - Scrollable */}
        <div className="overflow-y-auto flex-1">
          <div className="p-2">
            {currencies.map((currency) => {
              const isSelected = currency === selectedCurrency;
              return (
                <button
                  key={currency}
                  onClick={() => {
                    onSelect(currency);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isSelected
                      ? "bg-blue-50 border-2 border-blue-500"
                      : "hover:bg-gray-50 border-2 border-transparent"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 ${getCurrencyColor(currency)} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}
                  >
                    <span className="text-white text-base font-bold">
                      {getCurrencySymbol(currency)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      {currency}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getCurrencyName(currency)}
                    </p>
                  </div>

                  {/* Check icon si está seleccionado */}
                  {isSelected && (
                    <svg
                      className="h-5 w-5 text-blue-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default CurrencyDropdown;
