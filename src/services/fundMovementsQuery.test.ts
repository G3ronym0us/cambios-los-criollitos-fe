import { describe, expect, it } from 'vitest';
import { MovementType } from '@/types/fund';
import { buildMovementsQuery } from './fundMovementsQuery';

const parse = (qs: string) => new URLSearchParams(qs);

describe('buildMovementsQuery', () => {
  it('sin filtros devuelve string vacío', () => {
    expect(buildMovementsQuery()).toBe('');
    expect(buildMovementsQuery({})).toBe('');
  });

  it('agrega la hora a las fechas para el param `datetime` (evita el 422)', () => {
    const p = parse(buildMovementsQuery({ date_from: '2026-07-23', date_to: '2026-07-24' }));
    // date_to toma el final del día para incluir el día completo.
    expect(p.get('date_from')).toBe('2026-07-23T00:00:00');
    expect(p.get('date_to')).toBe('2026-07-24T23:59:59');
  });

  it('incluye tipo, página y tamaño de página cuando están presentes', () => {
    const p = parse(
      buildMovementsQuery({ movement_type: MovementType.EXCHANGE, page: 2, per_page: 50 }),
    );
    expect(p.get('movement_type')).toBe(MovementType.EXCHANGE);
    expect(p.get('page')).toBe('2');
    expect(p.get('per_page')).toBe('50');
  });

  it('omite las fechas cuando no se pasan', () => {
    const p = parse(buildMovementsQuery({ page: 1 }));
    expect(p.has('date_from')).toBe(false);
    expect(p.has('date_to')).toBe(false);
  });
});
