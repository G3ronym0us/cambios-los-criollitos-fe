import { describe, expect, it } from 'vitest';
import { getPaymentsListState } from './paymentsListState';

const base = {
  loading: false,
  error: null as string | null,
  paymentsCount: 3,
  attention: 'ALL' as const,
  hasActiveFilters: false,
};

describe('getPaymentsListState', () => {
  it('carga primero, aunque haya un error o filas de una consulta previa', () => {
    expect(getPaymentsListState({ ...base, loading: true, error: 'boom', paymentsCount: 0 })).toBe(
      'loading',
    );
  });

  it('el error no es una bandeja vacía: se distingue aunque la lista venga en 0', () => {
    expect(getPaymentsListState({ ...base, error: 'network', paymentsCount: 0 })).toBe('error');
    expect(getPaymentsListState({ ...base, error: 'network', paymentsCount: 5 })).toBe('error');
  });

  it('sin nada por atender es un logro, no el mismo vacío que un filtro sin resultados', () => {
    expect(
      getPaymentsListState({ ...base, paymentsCount: 0, attention: 'ATTENTION' }),
    ).toBe('empty-attention');
  });

  it('vacío con filtros puestos ofrece limpiarlos', () => {
    expect(
      getPaymentsListState({ ...base, paymentsCount: 0, hasActiveFilters: true }),
    ).toBe('empty-filtered');
  });

  it('vacío sin filtros activos: todavía no hay pagos que mostrar', () => {
    expect(getPaymentsListState({ ...base, paymentsCount: 0 })).toBe('empty-none');
  });

  it('con filas y sin error ni carga, pinta la lista', () => {
    expect(getPaymentsListState(base)).toBe('list');
  });

  it('"Por atender" con filtros puestos y 0 filas sigue siendo el logro, no el vacío de filtro', () => {
    // attention pesa más que hasActiveFilters: si además hay una búsqueda de texto puesta,
    // igual es cierto que no queda nada por atender.
    expect(
      getPaymentsListState({
        ...base,
        paymentsCount: 0,
        attention: 'ATTENTION',
        hasActiveFilters: true,
      }),
    ).toBe('empty-attention');
  });
});
