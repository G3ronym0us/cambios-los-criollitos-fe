import React from "react";

interface ShareableQuoteCardProps {
  fromAmount: number;
  toAmount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  bcvAmount?: string;
  bcvMode?: "usd" | "eur";
  generatedAt?: Date;
}

const currencyLabel: Record<string, string> = {
  USDT: "USDT",
  VES: "Bolívares",
  COP: "Pesos COP",
  BRL: "Reales",
  ZELLE: "Zelle",
  PAYPAL: "PayPal",
};

const ShareableQuoteCard = React.forwardRef<HTMLDivElement, ShareableQuoteCardProps>(
  (
    { fromAmount, toAmount, fromCurrency, toCurrency, rate, bcvAmount, bcvMode = "usd", generatedAt },
    ref
  ) => {
    const date = generatedAt ?? new Date();
    const dateStr = date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const fmt = (n: number, max = 2) =>
      n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: max });

    return (
      <div
        ref={ref}
        style={{
          width: 540,
          height: 540,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%)",
          color: "#ffffff",
          padding: 36,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, opacity: 0.75, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Cotización
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{dateStr}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              {currencyLabel[fromCurrency] || fromCurrency}
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {fmt(fromAmount)}{" "}
              <span style={{ fontSize: 20, fontWeight: 600, opacity: 0.8 }}>{fromCurrency}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.2)" }} />
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              ↓
            </div>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.2)" }} />
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 8px 24px rgba(37, 99, 235, 0.35)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
              {currencyLabel[toCurrency] || toCurrency}
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {fmt(toAmount)}{" "}
              <span style={{ fontSize: 20, fontWeight: 600, opacity: 0.9 }}>{toCurrency}</span>
            </div>
          </div>

          {bcvAmount && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(250, 204, 21, 0.12)",
                border: "1px solid rgba(250, 204, 21, 0.35)",
                borderRadius: 12,
                padding: "12px 16px",
              }}
            >
              <span style={{ fontSize: 13, opacity: 0.85 }}>
                Equivalente BCV ({bcvMode.toUpperCase()})
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {fmt(parseFloat(bcvAmount))}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, opacity: 0.65, fontVariantNumeric: "tabular-nums" }}>
            Tasa: 1 {fromCurrency} = {fmt(rate, 6)} {toCurrency}
          </div>
        </div>
      </div>
    );
  }
);

ShareableQuoteCard.displayName = "ShareableQuoteCard";

export default ShareableQuoteCard;
