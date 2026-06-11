import React from "react";
import { Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  getCurrencyName,
  getCurrencySymbol,
  getCurrencyColor,
} from "@/utils/currencyConfig";
import { cn } from "@/lib/utils";

interface CurrencyDropdownProps {
  isOpen: boolean;
  currencies: string[];
  selectedCurrency?: string;
  onSelect: (currency: string) => void;
  onClose: () => void;
  title: string;
}

// Selector de moneda como bottom-sheet (Drawer): focus trap, Escape y
// scroll-lock los maneja el primitivo; acá solo va la lista.
const CurrencyDropdown: React.FC<CurrencyDropdownProps> = ({
  isOpen,
  currencies,
  selectedCurrency,
  onSelect,
  onClose,
  title,
}) => {
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>

        <div className="-mx-2 flex-1 overflow-y-auto px-2">
          {currencies.map((currency) => {
            const isSelected = currency === selectedCurrency;
            return (
              <button
                key={currency}
                type="button"
                onClick={() => {
                  onSelect(currency);
                  onClose();
                }}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-lg p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected ? "bg-primary/10" : "hover:bg-accent"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm",
                    getCurrencyColor(currency)
                  )}
                >
                  <span className="text-base font-bold text-white">
                    {getCurrencySymbol(currency)}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{currency}</p>
                  <p className="text-xs text-muted-foreground">{getCurrencyName(currency)}</p>
                </div>

                {isSelected ? (
                  <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CurrencyDropdown;
