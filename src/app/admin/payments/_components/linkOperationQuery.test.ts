import { describe, expect, it } from 'vitest';
import { MATCH_PAGE_LIMIT, buildMatchQuery } from './linkOperationQuery';

describe('buildMatchQuery', () => {
  const base = {
    paymentId: 42,
    table: 'incoming' as const,
    isGroup: false,
    scope: 'auto' as const,
    clientPhone: '58412@c.us',
    search: '',
    statusView: 'active' as const,
    sortMode: 'suggested' as const,
    page: 1,
  };

  it('filtra por el telefono del cliente cuando el alcance es "auto" y no es un grupo', () => {
    // El caso que rompia el cajon: sin esto se pedian candidatas de TODO el sistema.
    const payload = buildMatchQuery(base);
    expect(payload.phone).toBe('58412@c.us');
    expect(payload.search).toBeUndefined();
    expect(payload.status).toBeUndefined();
  });

  it('no manda phone cuando el pago es de un grupo, aunque el alcance sea "auto"', () => {
    const payload = buildMatchQuery({ ...base, isGroup: true, clientPhone: null });
    expect(payload.phone).toBeUndefined();
  });

  it('"Ver todas" pide el lote global aunque haya un cliente resuelto', () => {
    const payload = buildMatchQuery({ ...base, scope: 'global' });
    expect(payload.phone).toBeUndefined();
  });

  it('manda el texto del buscador recortado', () => {
    const payload = buildMatchQuery({ ...base, search: '  luis  ' });
    expect(payload.search).toBe('luis');
  });

  it('un buscador vacio no manda search', () => {
    const payload = buildMatchQuery({ ...base, search: '   ' });
    expect(payload.search).toBeUndefined();
  });

  it('la pestana "Completadas" del lado saliente filtra por status en el servidor', () => {
    const payload = buildMatchQuery({ ...base, table: 'outgoing', statusView: 'completed' });
    expect(payload.status).toBe('COMPLETED');
  });

  it('"Activas" no manda status: QUOTED-o-PENDING no es un solo valor', () => {
    const payload = buildMatchQuery({ ...base, table: 'outgoing', statusView: 'active' });
    expect(payload.status).toBeUndefined();
  });

  it('el lado entrante nunca manda status, sea cual sea statusView', () => {
    const payload = buildMatchQuery({ ...base, table: 'incoming', statusView: 'completed' });
    expect(payload.status).toBeUndefined();
  });

  it('manda el modo de orden elegido como order_by, tal cual', () => {
    const payload = buildMatchQuery({ ...base, sortMode: 'amount' });
    expect(payload.order_by).toBe('amount');
  });

  it('manda payment_id, table y page tal cual, y limit fijo (el "corte" ahora es del servidor)', () => {
    const payload = buildMatchQuery({ ...base, page: 3 });
    expect(payload.payment_id).toBe(42);
    expect(payload.table).toBe('incoming');
    expect(payload.page).toBe(3);
    expect(payload.limit).toBe(MATCH_PAGE_LIMIT);
  });
});
