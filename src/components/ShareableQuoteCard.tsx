import React from "react";

interface ShareableQuoteCardProps {
  fromAmount: number;
  toAmount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  inversePercentage?: boolean;
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

// Paleta de marca Cambios Los Criollitos (hex directo: html-to-image no resuelve
// bien tokens oklch del tema, así que la tarjeta usa los valores de marca crudos).
const BRAND = {
  orange: "#E8821E",
  orangeDeep: "#D9740F",
  yellow: "#F5B81C",
  ink: "#232019",
  cream: "#FBFAF6",
  card: "#FFFFFF",
  muted: "#F4F2EC",
  border: "#E7E3D9",
  inkSoft: "rgba(35,32,25,0.55)",
};

// Logo de marca (sol + puente de Angostura) embebido para que entre en la captura.
const BrandLogo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
    <path d="M 8.7 35.0 A 44 44 0 0 1 83.7 21.7" fill="none" stroke={BRAND.orange} strokeWidth="8" strokeLinecap="round" />
    <polygon points="89.1,17.2 78.3,26.2 90.8,30.1" fill={BRAND.orange} />
    <path d="M 91.3 65.0 A 44 44 0 0 1 16.3 78.3" fill="none" stroke={BRAND.orange} strokeWidth="8" strokeLinecap="round" />
    <polygon points="10.9,82.8 21.7,73.8 9.2,69.9" fill={BRAND.orange} />
    <circle cx="50" cy="50" r="32" fill={BRAND.orange} />
    <circle cx="50" cy="40" r="10" fill={BRAND.yellow} />
    <rect x="24" y="56" width="52" height="4" rx="2" fill={BRAND.ink} />
    <rect x="35.2" y="38" width="3.6" height="20" rx="1.8" fill={BRAND.ink} />
    <rect x="61.2" y="38" width="3.6" height="20" rx="1.8" fill={BRAND.ink} />
    <path d="M 24 57 L 37 40 Q 50 56 63 40 L 76 57" fill="none" stroke={BRAND.ink} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 44 46.3 L 44 56 M 50 48 L 50 56 M 56 46.3 L 56 56" fill="none" stroke={BRAND.ink} strokeWidth="1.8" />
    <path d="M 29 68 Q 36 64.5 43 68 Q 50 71.5 57 68 Q 64 64.5 71 68" fill="none" stroke={BRAND.cream} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const ShareableQuoteCard = React.forwardRef<HTMLDivElement, ShareableQuoteCardProps>(
  (
    { fromAmount, toAmount, fromCurrency, toCurrency, rate, inversePercentage = false, bcvAmount, bcvMode = "usd", generatedAt },
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
          background: BRAND.cream,
          color: BRAND.ink,
          padding: 36,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        {/* Encabezado de marca */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandLogo size={44} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.2 }}>Los Criollitos</span>
              <span style={{ fontSize: 11, color: BRAND.inkSoft, letterSpacing: 1, textTransform: "uppercase" }}>
                Cambios
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: BRAND.inkSoft, textAlign: "right" }}>
            <div style={{ letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>Cotización</div>
            <div>{dateStr}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Monto de origen */}
          <div
            style={{
              background: BRAND.muted,
              border: `1px solid ${BRAND.border}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 12, color: BRAND.inkSoft, marginBottom: 6 }}>
              {currencyLabel[fromCurrency] || fromCurrency}
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {fmt(fromAmount)}{" "}
              <span style={{ fontSize: 20, fontWeight: 600, color: BRAND.inkSoft }}>{fromCurrency}</span>
            </div>
          </div>

          {/* Flecha */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <div style={{ height: 1, flex: 1, background: BRAND.border }} />
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: BRAND.orange,
                color: BRAND.cream,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              ↓
            </div>
            <div style={{ height: 1, flex: 1, background: BRAND.border }} />
          </div>

          {/* Monto resultante */}
          <div
            style={{
              background: `linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.orangeDeep} 100%)`,
              borderRadius: 16,
              padding: 20,
              color: BRAND.cream,
              boxShadow: "0 8px 24px rgba(232, 130, 30, 0.35)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>
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
                background: "rgba(245, 184, 28, 0.16)",
                border: "1px solid rgba(245, 184, 28, 0.5)",
                borderRadius: 12,
                padding: "12px 16px",
              }}
            >
              <span style={{ fontSize: 13, color: BRAND.inkSoft }}>
                Equivalente BCV ({bcvMode.toUpperCase()})
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {fmt(parseFloat(bcvAmount))}
              </span>
            </div>
          )}
        </div>

        {/* Pie con la tasa */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: BRAND.inkSoft, fontVariantNumeric: "tabular-nums" }}>
            {inversePercentage
              ? `Tasa: ${fmt(rate, 6)} ${fromCurrency} = 1 ${toCurrency}`
              : `Tasa: 1 ${fromCurrency} = ${fmt(rate, 6)} ${toCurrency}`}
          </div>
        </div>
      </div>
    );
  }
);

ShareableQuoteCard.displayName = "ShareableQuoteCard";

export default ShareableQuoteCard;
