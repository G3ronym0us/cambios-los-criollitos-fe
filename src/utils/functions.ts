import { Role } from "./enums";

export const formatNumber = (num: number) => {
  if (!num) return "0.00";
  return num.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
};

/**
 * Orienta una tasa para mostrarla SIEMPRE con el número >= 1 (el más legible),
 * eligiendo la dirección que corresponda. Es solo presentación: no altera el
 * `rate` almacenado ni los cálculos del backend.
 *
 * Ej.: VES->COP da 0.235 (1 VES = 0.235... ) -> se muestra "4.24 COP = 1 VES".
 *      VES->USDT da 0.00135 -> se muestra "738.69 VES = 1 USDT".
 *
 * Devuelve las piezas de la etiqueta "{value} {manyCurrency} = 1 {unitCurrency}"
 * para que cada componente aplique su propio formateo numérico.
 */
export const orientRateForDisplay = (
  rate: number,
  inversePercentage: boolean,
  fromCurrency: string,
  toCurrency: string
): { value: number; manyCurrency: string; unitCurrency: string } => {
  // effRate = cuántas unidades de TO equivalen a 1 de FROM
  const effRate = inversePercentage ? 1 / rate : rate;
  if (!isFinite(effRate) || effRate <= 0) {
    return { value: rate, manyCurrency: toCurrency, unitCurrency: fromCurrency };
  }
  return effRate >= 1
    ? { value: effRate, manyCurrency: toCurrency, unitCurrency: fromCurrency }
    : { value: 1 / effRate, manyCurrency: fromCurrency, unitCurrency: toCurrency };
};

export const getRoleOptions = () => {
  return Object.values(Role).map((role) => ({
    value: role,
    label: role,
  }));
};
// ── Fechas del negocio en hora de Venezuela ──────────────────────────────────
// Los timestamps llegan en UTC del backend; el operador trabaja en hora de
// Venezuela (America/Caracas, UTC-4). Usar SIEMPRE estos helpers para mostrar
// fechas de pagos/operaciones en vez de formatear con el timezone del browser.

export const formatCaracasDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Caracas',
  });
};

export const formatCaracasDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Caracas',
  });
};
