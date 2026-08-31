import { describe, expect, it } from 'vitest';
import { distribute, type DistributableOperation } from './distribute';

/** El caso del diseño: 250.000 sobre las cinco operaciones de Inversiones Katiuska. */
const katiuska: DistributableOperation[] = [
  { uuid: '3190', pending: 142_700, since: '2026-08-25T12:00:00Z' },
  { uuid: '3204', pending: 85_620, since: '2026-08-26T15:00:00Z' },
  { uuid: '3231', pending: 203_585.6, since: '2026-08-28T14:00:00Z' },
  { uuid: '3248', pending: 57_080, since: '2026-08-30T10:00:00Z' },
  { uuid: '3259', pending: 42_920, since: '2026-08-31T08:12:00Z' },
];

/** Lo que se le debe en total a Katiuska: la suma de las cinco. */
const TOTAL = 531_905.6;

const kindOf = (rows: { uuid: string; kind: string }[], uuid: string) =>
  rows.find((row) => row.uuid === uuid)?.kind;

describe('distribute', () => {
  it('cubre de la más vieja a la más nueva y deja la tercera a medias', () => {
    const result = distribute(250_000, katiuska);

    expect(kindOf(result.rows, '3190')).toBe('full');
    expect(kindOf(result.rows, '3204')).toBe('full');
    expect(kindOf(result.rows, '3231')).toBe('partial');
    expect(kindOf(result.rows, '3248')).toBe('none');
    expect(kindOf(result.rows, '3259')).toBe('none');

    expect(result.rows.find((row) => row.uuid === '3231')?.applied).toBe(21_680);
    expect(result.applied).toBe(250_000);
    expect(result.leftover).toBe(0);
    expect(result.outstanding).toBe(TOTAL - 250_000);
    expect(result.touched).toBe(3);
  });

  it('sin parciales no deja ninguna a medias y lo que no cabe queda como sobrante', () => {
    const result = distribute(250_000, katiuska, { allowPartial: false });

    expect(result.rows.every((row) => row.kind !== 'partial')).toBe(true);
    expect(result.applied).toBe(228_320);
    expect(result.leftover).toBe(21_680);
    expect(result.outstanding).toBe(TOTAL - 228_320);
  });

  it('sin parciales sigue buscando sitio en una operación más nueva pero más pequeña', () => {
    const operations: DistributableOperation[] = [
      { uuid: 'grande', pending: 200, since: '2026-08-01T00:00:00Z' },
      { uuid: 'pequena', pending: 50, since: '2026-08-02T00:00:00Z' },
    ];
    const result = distribute(100, operations, { allowPartial: false });

    expect(kindOf(result.rows, 'grande')).toBe('none');
    expect(kindOf(result.rows, 'pequena')).toBe('full');
    expect(result.applied).toBe(50);
    expect(result.leftover).toBe(50);
  });

  it('reparte entre las que quedan cuando el operador desmarca una fila', () => {
    const result = distribute(250_000, katiuska, { excluded: new Set(['3190']) });

    expect(kindOf(result.rows, '3190')).toBe('none');
    expect(kindOf(result.rows, '3204')).toBe('full');
    expect(kindOf(result.rows, '3231')).toBe('partial');
    expect(result.applied).toBe(250_000);
    expect(result.outstanding).toBe(TOTAL - 250_000);
  });

  it('un monto mayor que la deuda lo cubre todo y devuelve el sobrante', () => {
    const result = distribute(600_000, katiuska);

    expect(result.rows.every((row) => row.kind === 'full')).toBe(true);
    expect(result.applied).toBe(TOTAL);
    // El sobrante viene redondeado a dos decimales; `600_000 - TOTAL` en coma flotante no.
    expect(result.leftover).toBe(68_094.4);
    expect(result.outstanding).toBe(0);
  });

  it('un monto vacío o negativo no propone nada', () => {
    for (const amount of [0, -10, Number.NaN]) {
      const result = distribute(amount, katiuska);
      expect(result.touched).toBe(0);
      expect(result.applied).toBe(0);
      expect(result.outstanding).toBe(TOTAL);
    }
  });

  it('las operaciones sin fecha van al final del reparto', () => {
    const operations: DistributableOperation[] = [
      { uuid: 'sin-fecha', pending: 100, since: null },
      { uuid: 'vieja', pending: 100, since: '2026-08-01T00:00:00Z' },
    ];
    const result = distribute(100, operations);

    expect(kindOf(result.rows, 'vieja')).toBe('full');
    expect(kindOf(result.rows, 'sin-fecha')).toBe('none');
  });
});
