import { describe, expect, it } from 'vitest';
import type { OperationData, OperationMatchScore } from '@/types/operation';
import {
  CLIENT_SCOPE_LIMIT,
  GLOBAL_SCOPE_LIMIT,
  buildOperationQuery,
  sortScored,
  type ScoredOperation,
} from './linkOperationQuery';

function op(overrides: Partial<OperationData>): OperationData {
  return {
    uuid: 'op',
    created_at: '2026-08-30T00:00:00Z',
    ...overrides,
  } as OperationData;
}

function score(overrides: Partial<OperationMatchScore>): OperationMatchScore {
  return {
    uuid: 'op',
    delta: null,
    relative: null,
    currency_matches: true,
    amount_score: 0,
    time_score: 0,
    score: 0,
    within_tolerance: false,
    ...overrides,
  } as OperationMatchScore;
}

describe('buildOperationQuery', () => {
  it('filtra por el teléfono del cliente cuando el alcance es "auto" y no es un grupo', () => {
    // El caso que rompía el cajón: sin esto se pedían 500 operaciones globales sin más.
    const filters = buildOperationQuery({
      isGroup: false,
      scope: 'auto',
      clientPhone: '58412@c.us',
      search: '',
      table: 'incoming',
      statusView: 'active',
    });
    expect(filters.phone).toBe('58412@c.us');
    expect(filters.limit).toBe(CLIENT_SCOPE_LIMIT);
    expect(filters.search).toBeUndefined();
    expect(filters.status).toBeUndefined();
  });

  it('no manda phone cuando el pago es de un grupo, aunque el alcance sea "auto"', () => {
    const filters = buildOperationQuery({
      isGroup: true,
      scope: 'auto',
      clientPhone: null,
      search: '',
      table: 'incoming',
      statusView: 'active',
    });
    expect(filters.phone).toBeUndefined();
    expect(filters.limit).toBe(GLOBAL_SCOPE_LIMIT);
  });

  it('"Ver todas" pide el lote global aunque haya un cliente resuelto', () => {
    const filters = buildOperationQuery({
      isGroup: false,
      scope: 'global',
      clientPhone: '58412@c.us',
      search: '',
      table: 'incoming',
      statusView: 'active',
    });
    expect(filters.phone).toBeUndefined();
    expect(filters.limit).toBe(GLOBAL_SCOPE_LIMIT);
  });

  it('manda el texto del buscador recortado', () => {
    const filters = buildOperationQuery({
      isGroup: false,
      scope: 'auto',
      clientPhone: '58412@c.us',
      search: '  luis  ',
      table: 'incoming',
      statusView: 'active',
    });
    expect(filters.search).toBe('luis');
  });

  it('un buscador vacío no manda search', () => {
    const filters = buildOperationQuery({
      isGroup: false,
      scope: 'auto',
      clientPhone: '58412@c.us',
      search: '   ',
      table: 'incoming',
      statusView: 'active',
    });
    expect(filters.search).toBeUndefined();
  });

  it('la pestaña "Completadas" del lado saliente filtra por status en el servidor', () => {
    const filters = buildOperationQuery({
      isGroup: false,
      scope: 'auto',
      clientPhone: '58412@c.us',
      search: '',
      table: 'outgoing',
      statusView: 'completed',
    });
    expect(filters.status).toBe('COMPLETED');
  });

  it('"Activas" no manda status: QUOTED-o-PENDING no es un solo valor', () => {
    const filters = buildOperationQuery({
      isGroup: false,
      scope: 'auto',
      clientPhone: '58412@c.us',
      search: '',
      table: 'outgoing',
      statusView: 'active',
    });
    expect(filters.status).toBeUndefined();
  });

  it('el lado entrante nunca manda status, sea cual sea statusView', () => {
    const filters = buildOperationQuery({
      isGroup: false,
      scope: 'auto',
      clientPhone: '58412@c.us',
      search: '',
      table: 'incoming',
      statusView: 'completed',
    });
    expect(filters.status).toBeUndefined();
  });
});

describe('sortScored', () => {
  const a: ScoredOperation = {
    op: op({ uuid: 'a', created_at: '2026-08-28T00:00:00Z' }),
    score: score({ uuid: 'a', relative: 0.2, score: 0.3 }),
  };
  const b: ScoredOperation = {
    op: op({ uuid: 'b', created_at: '2026-08-30T00:00:00Z' }),
    score: score({ uuid: 'b', relative: 0.01, score: 0.9 }),
  };
  const c: ScoredOperation = {
    op: op({ uuid: 'c', created_at: '2026-08-29T00:00:00Z' }),
    score: null,
  };

  it('"time" ordena por creación, la más reciente primero', () => {
    const sorted = sortScored([a, b, c], 'time', null);
    expect(sorted.map((s) => s.op.uuid)).toEqual(['b', 'c', 'a']);
  });

  it('"amount" ordena por cercanía al monto; sin puntuación va al final', () => {
    const sorted = sortScored([a, b, c], 'amount', null);
    expect(sorted.map((s) => s.op.uuid)).toEqual(['b', 'a', 'c']);
  });

  it('"suggested" ordena por puntuación y no toca nada más si la sugerida ya gana', () => {
    const sorted = sortScored([a, b, c], 'suggested', 'b');
    expect(sorted.map((s) => s.op.uuid)).toEqual(['b', 'a', 'c']);
  });

  it('"suggested" adelanta a la sugerida aunque no tenga la puntuación más alta', () => {
    // Caso límite: el backend marcó "a" como sugerida (p.ej. coincide por token) aunque su
    // puntuación quede por debajo de "b". El cajón respeta la sugerencia del backend.
    const sorted = sortScored([a, b, c], 'suggested', 'a');
    expect(sorted[0].op.uuid).toBe('a');
  });

  it('sin ninguna puntuación cae en recencia — el orden de siempre', () => {
    const noScore = [a, b, c].map((s) => ({ ...s, score: null }));
    const sorted = sortScored(noScore, 'suggested', null);
    expect(sorted.map((s) => s.op.uuid)).toEqual(['b', 'c', 'a']);
  });
});
