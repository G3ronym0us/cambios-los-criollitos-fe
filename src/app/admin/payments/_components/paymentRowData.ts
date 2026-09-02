// Los textos de una fila de la bandeja, en un solo sitio: la tabla de desktop y la tarjeta
// de mobile muestran lo mismo con distinta forma, y así no se desincronizan.

import { formatNumber } from '@/utils/functions';
import type { PaymentData, PaymentSuggestion } from '@/types/payment';

export interface PaymentRowData {
  client: string;
  /** Banco, referencia y demás señas del comprobante, ya unidas por " · ". */
  source: string;
  amount: string;
  /** "USD · Zelle": la moneda y por dónde entró. */
  method: string;
  /** Hora en Caracas y el día ("hoy" / "ayer" / "25 jul"). */
  time: string;
  day: string;
  /**
   * `time` y `day` en un solo renglón, para sitios angostos como la tarjeta de mobile:
   * el caso normal (hoy) se queda solo con la hora, y solo se antepone el día cuando
   * hace falta distinguirlo — así no se repite "hoy" en cada tarjeta de la lista.
   */
  when: string;
  /** La operación de la fila: la vinculada, o el resumen del reparto. */
  operation: string | null;
}

const stripJid = (phone: string | null | undefined) => (phone || '').replace(/@(c|g)\.us$/, '');

/**
 * Cuánto del comprobante cubre una operación, dicho en palabras.
 *
 * Antes salía el delta con signo ("±0", "-200", "+280"), que obliga a recordar de qué lado
 * se resta: el operador traducía a "sobra" o "falta" en la cabeza, en cada tarjeta. `delta`
 * es esperado − pagado, así que negativo = el comprobante trae de más y positivo = la
 * operación pide más de lo que llegó.
 */
export function describeCoverage(delta: number, paid: number, currency: string): string {
  const unidad = currency ? ` ${currency}` : '';
  if (Math.abs(delta) < 0.005) return 'Cubre la operación exacta';
  if (delta < 0) return `Cubre la operación · sobran ${formatNumber(-delta)}${unidad}`;
  return `Cubre ${formatNumber(paid)} de ${formatNumber(paid + delta)}${unidad} · faltarían ${formatNumber(delta)}`;
}

// Etiquetas de los campos corregibles, para narrar la corrección en el idioma de la pantalla.
const CORRECTED_FIELD_LABELS: Record<string, string> = {
  amount: 'monto',
  currency: 'moneda',
  reference: 'referencia',
  provider: 'método',
  bank_from: 'banco origen',
  bank_to: 'banco destino',
  identification: 'identificación',
  phone_to: 'teléfono',
};

/**
 * Qué había leído el bot antes de que alguien lo corrigiera. `correction_original` viaja
 * como JSON con el snapshot previo ({"amount": 4.0}); pintarlo crudo enseñaba las llaves
 * y el nombre de la columna en inglés.
 */
export function describeCorrection(p: PaymentData): string | null {
  if (!p.correction_original) return null;
  let snapshot: Record<string, unknown>;
  try {
    snapshot = JSON.parse(p.correction_original) as Record<string, unknown>;
  } catch {
    return p.correction_original; // formato viejo o no-JSON: mejor mostrarlo tal cual
  }
  const parts = Object.entries(snapshot)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => {
      const label = CORRECTED_FIELD_LABELS[key] ?? key;
      const shown = typeof value === 'number' ? formatNumber(value) : String(value);
      return `${label} ${shown}`;
    });
  return parts.length > 0 ? parts.join(' · ') : null;
}

function caracasDayKey(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
}

/**
 * `now` es parámetro (no `new Date()` implícito) para que el test pueda fijar "hoy" sin
 * depender del reloj de la máquina que corre la suite.
 */
function describeDay(value: string | null, now: Date = new Date()): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yesterday = new Date(now.getTime() - 86400000);
  const key = caracasDayKey(date);
  if (key === caracasDayKey(now)) return 'hoy';
  if (key === caracasDayKey(yesterday)) return 'ayer';
  return date.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Caracas',
  });
}

function describeTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Caracas',
  });
}

/**
 * Ver el docstring de `PaymentRowData.when`: hora sola si es de hoy, día + hora si no.
 * Es lo que le faltaba a la tarjeta de mobile (`PaymentItem`) — solo pintaba la hora,
 * y con un pago de ayer o de hace una semana se leía igual que uno de hace un minuto.
 */
function describeWhen(value: string | null, now: Date = new Date()): string {
  const time = describeTime(value);
  const day = describeDay(value, now);
  return day && day !== 'hoy' ? `${day} ${time}` : time;
}

export function describePayment(p: PaymentData, now: Date = new Date()): PaymentRowData {
  const bank = p.bank_to || p.bank_from || null;
  const source = [
    bank,
    p.reference ? `ref ${p.reference}` : null,
    !bank && !p.reference ? p.provider : null,
    p.corrected_at ? 'corregido' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // El proveedor suele repetir la moneda ("ZELLE · zelle"): solo se añade si aporta algo.
  const provider =
    p.provider && p.provider.toUpperCase() !== (p.currency || '').toUpperCase() ? p.provider : null;

  return {
    client: p.client_name || stripJid(p.client_phone) || 'Sin identificar',
    source: source || 'Sin datos del comprobante',
    amount: p.amount != null ? formatNumber(p.amount) : '—',
    method: [p.currency, provider].filter(Boolean).join(' · ') || '—',
    time: describeTime(p.created_at),
    day: describeDay(p.created_at, now),
    when: describeWhen(p.created_at, now),
    operation: describeOperation(p),
  };
}

function describeOperation(p: PaymentData): string | null {
  const deposit = p.deposit;
  if (deposit && (deposit.group_name || deposit.amount != null)) {
    const amount = deposit.amount != null ? `+${formatNumber(deposit.amount)}` : '';
    return [deposit.group_name, `${amount} ${deposit.currency ?? ''}`.trim()]
      .filter(Boolean)
      .join(' · ');
  }
  if (p.loan) {
    return `Saldo ${formatNumber(p.loan.outstanding_amount)} ${
      p.loan.preferred_currency === 'USD_BCV' ? 'USD (BCV)' : p.loan.preferred_currency
    }`;
  }
  if ((p.credited_to_balance ?? 0) > 0.01 && !p.operation_uuid) return 'Acreditado al cliente';
  if ((p.allocations_count ?? 0) > 1) return `${p.allocations_count} operaciones`;
  if (p.is_personal_expense && p.personal_description) return p.personal_description;
  if (p.is_irrelevant && p.irrelevant_description) return p.irrelevant_description;
  return null;
}

/**
 * "USD/BRL · 200 → 1.086" para la celda de operación sugerida.
 *
 * La barra y no la flecha entre las monedas: es el `pair_symbol` del backend, y la flecha
 * queda libre para lo que sí es una conversión (los montos).
 */
export function describeSuggestion(s: PaymentSuggestion): string {
  const pair = [s.from_currency, s.to_currency].filter(Boolean).join('/');
  const amounts = [
    s.from_amount != null ? formatNumber(s.from_amount) : null,
    s.to_amount != null ? formatNumber(s.to_amount) : null,
  ].filter(Boolean);
  return [pair || null, amounts.length === 2 ? amounts.join(' → ') : null]
    .filter(Boolean)
    .join(' · ');
}
