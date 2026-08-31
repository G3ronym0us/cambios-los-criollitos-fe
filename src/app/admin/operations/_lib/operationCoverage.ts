import type { OperationData } from '@/types/operation';

/**
 * La cobertura de una operación: cuánto de su valor cubren ya los comprobantes.
 *
 * Es la única lectura que decide si hoy tocas esa fila, y hasta ahora el listado la
 * ignoraba —mostraba la tasa dos veces y la cobertura ninguna—, aunque el detalle ya
 * sabía `delivered_amount` y `pending_amount`.
 */

export type CoverageKind =
  | 'none' // cancelada: no hay nada que cubrir
  | 'quote' // cotizada: todavía no es un trato
  | 'delivery' // cubierta en dinero, pendiente la entrega física
  | 'missing' // sin ningún comprobante
  | 'short' // hay comprobantes pero no alcanzan
  | 'covered';

export interface Coverage {
  kind: CoverageKind;
  label: string;
  detail: string | null;
  /** Las que piden acción se pintan; lo normal no grita. */
  tone: 'neutral' | 'warning' | 'destructive' | 'success';
}

function formatAmount(value: number, currency: string | null): string {
  const n = value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${n} ${currency}` : n;
}

function plural(count: number): string {
  return count === 1 ? '1 comprobante' : `${count} comprobantes`;
}

/**
 * El orden importa y no es arbitrario: una cancelada no pide nada aunque le falte dinero,
 * una cotizada todavía no es un trato, y una que ya está cubierta en dinero pero espera la
 * entrega del efectivo es un caso de entrega, no de cuadre.
 */
export function getCoverage(op: OperationData): Coverage {
  if (op.status === 'CANCELLED') {
    return { kind: 'none', label: '—', detail: null, tone: 'neutral' };
  }

  if (op.status === 'QUOTED') {
    return { kind: 'quote', label: '—', detail: 'sin comprobantes todavía', tone: 'neutral' };
  }

  const pending = op.pending_amount ?? 0;
  const covered = pending <= 0.01;
  const count = op.payments_count ?? 0;
  const currency = op.currency ?? op.from_currency;

  if (covered && op.delivery_status === 'PENDING') {
    return {
      kind: 'delivery',
      label: 'Por entregar',
      detail: 'cubierta · falta el efectivo',
      tone: 'warning',
    };
  }

  if (count === 0) {
    return {
      kind: 'missing',
      label: 'Sin comprobante',
      // Una operación sin comprobante que alguien aceptó dejar así no es una alerta.
      detail: op.no_payments_ack_at
        ? `aceptado por ${op.no_payments_ack_by_username ?? '—'}`
        : 'vincula uno para saber quién es',
      tone: op.no_payments_ack_at ? 'neutral' : 'destructive',
    };
  }

  if (!covered) {
    return {
      kind: 'short',
      label: `Faltan ${formatAmount(pending, currency)}`,
      detail: plural(count),
      tone: 'warning',
    };
  }

  return { kind: 'covered', label: 'Cubierta', detail: plural(count), tone: 'success' };
}

/**
 * La desviación entre la tasa que se cotizó y la que salió de los comprobantes, en %.
 * `null` cuando aún no hay tasa real con la que comparar.
 */
export function rateDeviation(op: OperationData): number | null {
  if (!op.real_rate || !op.rate_used || op.rate_used <= 0) return null;
  const deviation = ((op.real_rate - op.rate_used) / op.rate_used) * 100;
  return Number.isFinite(deviation) ? Math.round(deviation * 100) / 100 : null;
}

/** "en 6 min", "en 2 h" — cuánto le queda a una cotización antes de vencer. */
export function timeUntil(iso: string | null, now: number = Date.now()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const minutes = Math.round((then - now) / 60000);
  if (minutes < 0) return 'vencida';
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `en ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `en ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'en 1 día' : `en ${days} días`;
}

/** "hace 2 días" — la antigüedad de la entrega más vieja. */
export function timeSince(iso: string | null, now: number = Date.now()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}
