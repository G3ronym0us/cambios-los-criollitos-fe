import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMonthGrid,
  daysInclusive,
  formatRangeLabel,
  inRange,
  monthTitle,
  parseISO,
  presetRange,
  shortDay,
  toISO,
  toggleRangeDay,
} from './dateRange';

const mondayIndex = (iso: string) => (parseISO(iso)!.getDay() + 6) % 7;

describe('toISO / parseISO', () => {
  it('serializa y parsea en hora local sin corrimiento de zona', () => {
    expect(toISO(new Date(2026, 6, 9))).toBe('2026-07-09');
    const d = parseISO('2026-07-09')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 6, 9]);
  });

  it('devuelve null ante entrada vacía o inválida', () => {
    expect(parseISO(undefined)).toBeNull();
    expect(parseISO('')).toBeNull();
    expect(parseISO('no-fecha')).toBeNull();
  });
});

describe('buildMonthGrid', () => {
  const grid = buildMonthGrid(2026, 6); // julio 2026

  it('cubre semanas completas empezando en lunes', () => {
    expect(grid.length % 7).toBe(0);
    expect(mondayIndex(grid[0].iso)).toBe(0);
  });

  it('incluye los 31 días del mes y marca el desborde como fuera de mes', () => {
    const inMonth = grid.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].iso).toBe('2026-07-01');
    expect(inMonth[30].iso).toBe('2026-07-31');
    expect(grid[0].inMonth).toBe(false); // arranca con días de junio
  });
});

describe('toggleRangeDay', () => {
  it('primer toque fija el inicio', () => {
    expect(toggleRangeDay({}, '2026-07-10')).toEqual({ from: '2026-07-10', to: undefined });
  });

  it('segundo toque posterior cierra el rango', () => {
    expect(toggleRangeDay({ from: '2026-07-10' }, '2026-07-24')).toEqual({
      from: '2026-07-10',
      to: '2026-07-24',
    });
  });

  it('segundo toque anterior ordena el rango', () => {
    expect(toggleRangeDay({ from: '2026-07-10' }, '2026-07-05')).toEqual({
      from: '2026-07-05',
      to: '2026-07-10',
    });
  });

  it('con el rango completo, un nuevo toque reinicia', () => {
    expect(toggleRangeDay({ from: '2026-07-10', to: '2026-07-24' }, '2026-07-15')).toEqual({
      from: '2026-07-15',
      to: undefined,
    });
  });
});

describe('inRange', () => {
  it('respeta los bordes y exige rango completo', () => {
    expect(inRange('2026-07-10', '2026-07-10', '2026-07-24')).toBe(true);
    expect(inRange('2026-07-24', '2026-07-10', '2026-07-24')).toBe(true);
    expect(inRange('2026-07-15', '2026-07-10', '2026-07-24')).toBe(true);
    expect(inRange('2026-07-25', '2026-07-10', '2026-07-24')).toBe(false);
    expect(inRange('2026-07-15', '2026-07-10', undefined)).toBe(false);
  });
});

describe('etiquetas', () => {
  it('formatRangeLabel cubre rango, extremos sueltos y vacío', () => {
    expect(formatRangeLabel('2026-07-10', '2026-07-24')).toBe('10 jul – 24 jul');
    expect(formatRangeLabel('2026-07-10', undefined)).toBe('Desde 10 jul');
    expect(formatRangeLabel(undefined, '2026-07-24')).toBe('Hasta 24 jul');
    expect(formatRangeLabel(undefined, undefined)).toBe('');
  });

  it('shortDay y monthTitle', () => {
    expect(shortDay('2026-07-09')).toBe('9 jul');
    expect(monthTitle(2026, 6)).toBe('Julio 2026');
  });

  it('daysInclusive cuenta ambos extremos', () => {
    expect(daysInclusive('2026-07-10', '2026-07-10')).toBe(1);
    expect(daysInclusive('2026-07-10', '2026-07-24')).toBe(15);
  });
});

describe('presetRange', () => {
  afterEach(() => vi.useRealTimers());

  it('calcula los atajos respecto a la fecha actual', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 24, 12, 0, 0));

    expect(presetRange('today')).toEqual({ from: '2026-07-24', to: '2026-07-24' });
    expect(presetRange('last7')).toEqual({ from: '2026-07-18', to: '2026-07-24' });
    expect(presetRange('last30')).toEqual({ from: '2026-06-25', to: '2026-07-24' });
    expect(presetRange('thisMonth')).toEqual({ from: '2026-07-01', to: '2026-07-24' });
  });
});
