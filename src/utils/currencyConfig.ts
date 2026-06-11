export interface CurrencyMeta {
  name: string;
  symbol: string;
  /** Fondo saturado para avatares (texto blanco encima, válido en light y dark). */
  color: string;
  /** Tinte de fondo + borde para paneles/campos del acento contextual. */
  tint: string;
  /** Color de texto del acento, con variante dark. */
  text: string;
}

export interface CurrencyConfig {
  [key: string]: CurrencyMeta;
}

export const currencyConfig: CurrencyConfig = {
  USDT: {
    name: "USDT",
    symbol: "$",
    color: "bg-green-500",
    tint: "bg-green-500/10 border-green-500/30",
    text: "text-green-700 dark:text-green-400",
  },
  VES: {
    name: "Bolívares",
    symbol: "Bs",
    color: "bg-yellow-500",
    tint: "bg-yellow-500/10 border-yellow-500/30",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  COP: {
    name: "Pesos COP",
    symbol: "COL$",
    color: "bg-blue-500",
    tint: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  BRL: {
    name: "Reales",
    symbol: "R$",
    color: "bg-purple-500",
    tint: "bg-purple-500/10 border-purple-500/30",
    text: "text-purple-700 dark:text-purple-400",
  },
  ZELLE: {
    name: "Zelle",
    symbol: "$",
    color: "bg-indigo-500",
    tint: "bg-indigo-500/10 border-indigo-500/30",
    text: "text-indigo-700 dark:text-indigo-400",
  },
  PAYPAL: {
    name: "PayPal",
    symbol: "$",
    color: "bg-cyan-500",
    tint: "bg-cyan-500/10 border-cyan-500/30",
    text: "text-cyan-700 dark:text-cyan-400",
  },
};

export const getCurrencyName = (code: string): string => {
  return currencyConfig[code]?.name || code.toUpperCase();
};

export const getCurrencySymbol = (code: string): string => {
  return currencyConfig[code]?.symbol || "";
};

export const getCurrencyColor = (code: string): string => {
  return currencyConfig[code]?.color || "bg-muted-foreground";
};

export const getCurrencyTint = (code: string): string => {
  return currencyConfig[code]?.tint || "bg-muted border-border";
};

export const getCurrencyText = (code: string): string => {
  return currencyConfig[code]?.text || "text-muted-foreground";
};
