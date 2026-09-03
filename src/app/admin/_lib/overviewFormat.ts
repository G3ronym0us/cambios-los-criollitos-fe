// Lectura pura del agregado de `/admin/overview`: formateo de cifras, "la más vieja
// lleva X" y el recorte de `unassigned_truncated`. Sin llamadas a red ni estado — así se
// prueba con vitest sin levantar nada.

/** "1.240,00 USD" — dos decimales fijos, coma decimal (es-VE, igual que el resto del panel). */
export function formatMoney(value: number, currency: string | null | undefined): string {
  const n = value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${n} ${currency}` : n;
}

/** El recorte del backend: dice "o más" en vez de fingir exactitud. */
export function formatUnassigned(
  amount: number,
  currency: string | null | undefined,
  truncated: boolean
): string {
  const base = formatMoney(amount, currency);
  return truncated ? `${base} o más sin asignar` : `${base} sin asignar`;
}

/** "en 6 min", "en 2 h", "vencida" — cuánto le queda a una cotización antes de vencer. */
export function timeUntil(iso: string | null | undefined, now: number = Date.now()): string | null {
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

/** "hace 2 días", "ayer", "hoy" — la antigüedad de la entrega/pendiente más vieja. */
export function timeSince(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

/**
 * "2 días", "9 h", "40 min" — la misma duración que `timeSince` pero sin el "hace", para
 * frases que ya traen su propio verbo ("la más vieja lleva 2 días").
 */
export function bareDuration(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 60) return minutes === 1 ? '1 min' : `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 h' : `${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 día' : `${days} días`;
}

/** "3 d", "2 d", "ayer" — la columna compacta de "clientes con pendiente" (móvil incluido). */
export function waitingDaysLabel(days: number): string {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `${days} d`;
}

/** "hace 9 h" para una lectura de tasa vieja; `null` cuando la lectura está fresca. */
export function staleLabel(hours: number | null | undefined): string | null {
  if (hours == null) return null;
  const rounded = Math.round(hours);
  return `sin lectura desde hace ${rounded} h`;
}

/** "+3,6 %" / "-1,1 %" — la desviación de una alerta de tasa. */
export function formatDeviation(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  const n = pct.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${sign}${n} %`;
}

/** "5,4" — el promedio de la semana con un decimal, como lo pinta el diseño. */
export function formatDailyAverage(value: number): string {
  return value.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Los tres mayores pendientes por entregar son qué fracción del total: "los 3 mayores
 * son el 71 %". `null` cuando no hay total con qué dividir (evita el NaN%).
 */
export function topShareOfTotal(topAmounts: number[], total: number): number | null {
  if (!total || total <= 0) return null;
  const sum = topAmounts.reduce((acc, v) => acc + v, 0);
  const pct = Math.round((sum / total) * 100);
  return Number.isFinite(pct) ? pct : null;
}

/** Todas las cifras de trabajo en cero: es el momento de decir "todo conciliado". */
export function isFullyReconciled(counts: {
  needsAttention: number;
  toSettle: number;
  toDeliver: number;
  expiring: number;
}): boolean {
  return (
    counts.needsAttention <= 0 &&
    counts.toSettle <= 0 &&
    counts.toDeliver <= 0 &&
    counts.expiring <= 0
  );
}

/** "hace 40 s" — el reloj en vivo del encabezado, a partir de `generated_at`. */
export function liveAgo(generatedAtIso: string | null, now: number = Date.now()): string {
  if (!generatedAtIso) return '—';
  const then = new Date(generatedAtIso).getTime();
  if (!Number.isFinite(then)) return '—';
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? 'hace 1 min' : `hace ${minutes} min`;
}
