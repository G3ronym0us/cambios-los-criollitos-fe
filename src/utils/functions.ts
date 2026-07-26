import { Role } from "./enums";

export const formatNumber = (num: number) => {
  if (!num) return "0.00";
  return num.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
};

export const formatAmountForInput = (num: number | null | undefined) => {
  if (num == null || !Number.isFinite(num)) return "";
  return String(Math.round((num + Number.EPSILON) * 100) / 100);
};

export const sanitizeAmountInput = (value: string) => {
  const normalized = value.replace(",", ".");
  return /^\d*(?:\.\d{0,2})?$/.test(normalized) ? normalized : null;
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

/** Día calendario en Caracas como `YYYY-MM-DD`, para comparar "¿es hoy?" sin líos de UTC. */
const caracasDayKey = (date: Date): string =>
  date.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

/**
 * Versión corta para listas apretadas: solo la hora si el timestamp es de hoy en Caracas
 * ("14:32"), y día + hora si es de otro día ("25 jul 14:32").
 */
export const formatCaracasShortDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const time = date.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Caracas',
  });
  if (caracasDayKey(date) === caracasDayKey(new Date())) return time;
  const day = date.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Caracas',
  });
  return `${day} ${time}`;
};

/** "hace 3 min" / "hace 3 h" / "hace 2 d". Acompaña a la hora absoluta, no la sustituye. */
export const formatRelativeTime = (
  value: string | null | undefined,
  nowMs: number = Date.now(),
): string => {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const diffSec = Math.round((nowMs - time) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return 'hace un momento';
  // Un timestamp en el futuro (reloj desfasado) se lee "en X" en vez de mentir con "hace".
  const prefix = diffSec >= 0 ? 'hace' : 'en';
  const minutes = Math.floor(abs / 60);
  if (minutes < 60) return `${prefix} ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${prefix} ${hours} h`;
  return `${prefix} ${Math.floor(hours / 24)} d`;
};

/**
 * ¿El "cliente" de una operación es en realidad un marcador de que aún no sabemos quién
 * es? Cubre el JID de un grupo contable (comprobante reenviado, ops antiguas) y los
 * clientes anónimos que crea el backend cuando el operador atendió al cliente por fuera
 * del bot. Espejo de `WhatsAppQuoteService.is_unassigned_client_phone`.
 */
export const isUnassignedClientPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  return phone.endsWith('@g.us') || phone.startsWith('anon:');
};
