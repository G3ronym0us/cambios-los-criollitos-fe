import React from "react";
import { ChevronDown } from "lucide-react";
import { getCurrencySymbol, getCurrencyColor } from "@/utils/currencyConfig";

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
        type="button"
        onClick={onClick}
        aria-label={`Seleccionar moneda ${label === "De" ? "origen" : "destino"}`}
        className="flex min-h-11 items-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-card px-2.5 py-1.5 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
          <span className="text-sm text-muted-foreground">?</span>
        </div>
        <div className="hidden sm:block">
          <p className="text-[10px] leading-none text-muted-foreground">{label}</p>
          <p className="text-xs font-medium text-muted-foreground">Seleccionar</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground sm:hidden">Moneda</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Cambiar moneda ${label === "De" ? "origen" : "destino"} (actual: ${currency})`}
      className="group flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${getCurrencyColor(currency)}`}
      >
        <span className="text-xs font-bold text-white">{getCurrencySymbol(currency)}</span>
      </div>
      <div className="hidden text-left sm:block">
        <p className="text-[10px] leading-none text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold text-foreground">{currency}</p>
      </div>
      <span className="text-xs font-semibold text-foreground sm:hidden">{currency}</span>
      <ChevronDown
        className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden
      />
    </button>
  );
};

export default CurrencyChip;
