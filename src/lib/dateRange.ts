/**
 * Utilidades puras para el selector de rango de fechas reutilizable.
 * Todas las fechas «serializadas» usan el formato yyyy-mm-dd (el que consumen los
 * <input type="date"> y los endpoints del backend), interpretado en hora local.
 */

export interface DateRange {
  from?: string;
  to?: string;
}

export type DatePreset = 'today' | 'last7' | 'last30' | 'thisMonth';

const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/** Cabecera de días de la semana, empezando en lunes. */
export const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parsea yyyy-mm-dd como fecha local (evita el corrimiento de zona de `new Date(str)`). */
export function parseISO(s?: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function presetRange(kind: DatePreset): { from: string; to: string } {
  const now = new Date();
  const to = toISO(now);
  switch (kind) {
    case 'today':
      return { from: to, to };
    case 'last7': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: toISO(d), to };
    }
    case 'last30': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: toISO(d), to };
    }
    case 'thisMonth':
      return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  }
}

/** Etiqueta larga capitalizada para la cabecera del calendario: «Julio 2026». */
export function monthTitle(year: number, month: number): string {
  return `${MONTHS_FULL[month]} ${year}`;
}

/** Etiqueta corta «10 jul» para un extremo del rango. */
export function shortDay(iso?: string): string {
  const d = parseISO(iso);
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`;
}

/** Etiqueta del rango para el chip: «10 jul – 24 jul» (o un solo extremo). */
export function formatRangeLabel(from?: string, to?: string): string {
  if (from && to) return `${shortDay(from)} – ${shortDay(to)}`;
  if (from) return `Desde ${shortDay(from)}`;
  if (to) return `Hasta ${shortDay(to)}`;
  return '';
}

export function daysInclusive(from: string, to: string): number {
  const a = parseISO(from);
  const b = parseISO(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

export interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

/**
 * Grilla de días (semanas completas, lunes primero) que cubre el mes indicado,
 * incluyendo los días «desbordados» del mes anterior/siguiente para completar filas.
 */
export function buildMonthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((startOffset + daysInMonth) / 7);
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return { iso: toISO(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

/** Aplica un click de día a un borrador de rango (selección en dos toques). */
export function toggleRangeDay(range: DateRange, iso: string): DateRange {
  const { from, to } = range;
  if (!from || (from && to)) return { from: iso, to: undefined };
  // Hay `from` y falta `to`: se cierra el rango (ordenando si el segundo es anterior).
  return iso >= from ? { from, to: iso } : { from: iso, to: from };
}

/** ¿`iso` cae dentro (o en los bordes) del rango `from..to`? Comparación lexicográfica válida en yyyy-mm-dd. */
export function inRange(iso: string, from?: string, to?: string): boolean {
  if (!from || !to) return false;
  return iso >= from && iso <= to;
}
