export interface CurrencyConfig {
  [key: string]: {
    name: string;
    symbol: string;
    color: string;
  };
}

export const currencyConfig: CurrencyConfig = {
  USDT: { name: "USDT", symbol: "$", color: "bg-green-500" },
  VES: { name: "Bolívares", symbol: "Bs", color: "bg-yellow-500" },
  COP: { name: "Pesos COP", symbol: "COL$", color: "bg-blue-500" },
  BRL: { name: "Reales", symbol: "R$", color: "bg-purple-500" },
  ZELLE: { name: "Zelle", symbol: "$", color: "bg-indigo-500" },
  PAYPAL: { name: "PayPal", symbol: "$", color: "bg-cyan-500" },
};

export const getCurrencyName = (code: string): string => {
  return currencyConfig[code]?.name || code.toUpperCase();
};

export const getCurrencySymbol = (code: string): string => {
  return currencyConfig[code]?.symbol || "";
};

export const getCurrencyColor = (code: string): string => {
  return currencyConfig[code]?.color || "bg-gray-500";
};
