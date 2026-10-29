// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHistoricalRate, localDateTimeToIso } from './useHistoricalRate';
import { ratesService } from '@/services/ratesService';
import type { ExchangeRateResponse } from '@/types/currency';

vi.mock('@/services/ratesService', () => ({ ratesService: { getHistoricalRate: vi.fn() } }));
const request = vi.mocked(ratesService.getHistoricalRate);
const past = '2025-06-10T14:30';
const rate = { currency_pair_uuid: 'pair-a', rate: 40, created_at: '2025-06-10T10:00:00Z' } as ExchangeRateResponse;
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('consulta histórica de la calculadora', () => {
  it('convierte la fecha y hora local al instante ISO con zona horaria', () => {
    expect(localDateTimeToIso(past)).toBe(new Date(2025, 5, 10, 14, 30).toISOString());
  });

  it.each(['', 'no-date', '2025-02-30T14:30', '2099-01-01T10:00'])('rechaza fecha vacía, inválida o futura: %s', value => {
    expect(() => localDateTimeToIso(value)).toThrow();
  });

  it('sin sesión privilegiada no consulta ni activa el histórico', () => {
    const { result } = renderHook(() => useHistoricalRate(false, 'pair-a'));
    act(() => result.current.load(past));
    expect(request).not.toHaveBeenCalled();
    expect(result.current.at).toBeNull();
  });

  it('consulta el par y el instante exactos, sin utilizar la tasa actual', async () => {
    request.mockResolvedValue({ success: true, data: rate });
    const { result } = renderHook(() => useHistoricalRate(true, 'pair-a'));
    act(() => result.current.load(past));
    await waitFor(() => expect(result.current.rate).toEqual(rate));
    expect(request).toHaveBeenCalledWith('pair-a', new Date(2025, 5, 10, 14, 30).toISOString());
    expect(result.current.loading).toBe(false);
  });

  it('muestra error de validación sin llamar al servidor', () => {
    const { result } = renderHook(() => useHistoricalRate(true, 'pair-a'));
    act(() => result.current.load(''));
    expect(result.current.error).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });

  it('sin historial conserva el modo histórico y no cae a tasas actuales', async () => {
    request.mockResolvedValue({ success: false, error: 'No hay historial' });
    const { result } = renderHook(() => useHistoricalRate(true, 'pair-a'));
    act(() => result.current.load(past));
    await waitFor(() => expect(result.current.error).toContain('No hay historial'));
    expect(result.current.at).not.toBeNull();
    expect(result.current.rate).toBeNull();
  });

  it('explica en español la ausencia de historial devuelta por la API', async () => {
    request.mockResolvedValue({ success: false, error: 'No rate found for pair ZELLE-VES at or before 2025-06-10' });
    const { result } = renderHook(() => useHistoricalRate(true, 'pair-a'));
    act(() => result.current.load(past));
    await waitFor(() => expect(result.current.error).toContain('No hay una tasa registrada'));
  });

  it('permite reintentar la misma fecha después de un error de red', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    request.mockResolvedValueOnce({ success: true, data: rate });
    const { result } = renderHook(() => useHistoricalRate(true, 'pair-a'));
    act(() => result.current.load(past));
    await waitFor(() => expect(result.current.error).toContain('Intenta de nuevo'));
    act(() => result.current.load(past));
    await waitFor(() => expect(result.current.rate).toEqual(rate));
    expect(result.current.error).toBe('');
  });

  it('cambiar de par consulta su historial y descarta respuestas tardías', async () => {
    let resolveFirst!: (value: { success: boolean; data: ExchangeRateResponse }) => void;
    request.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    const other = { ...rate, currency_pair_uuid: 'pair-b', rate: 80 };
    request.mockResolvedValueOnce({ success: true, data: other });
    const { result, rerender } = renderHook(({ pair }) => useHistoricalRate(true, pair), { initialProps: { pair: 'pair-a' } });
    act(() => result.current.load(past));
    rerender({ pair: 'pair-b' });
    await waitFor(() => expect(result.current.rate).toEqual(other));
    await act(async () => resolveFirst({ success: true, data: rate }));
    expect(result.current.rate).toEqual(other);
  });

  it('volver a actual cancela el resultado de una consulta pendiente', async () => {
    let resolveRequest!: (value: { success: boolean; data: ExchangeRateResponse }) => void;
    request.mockImplementation(() => new Promise(resolve => { resolveRequest = resolve; }));
    const { result } = renderHook(() => useHistoricalRate(true, 'pair-a'));
    act(() => result.current.load(past));
    act(() => result.current.reset());
    await act(async () => resolveRequest({ success: true, data: rate }));
    expect(result.current.at).toBeNull();
    expect(result.current.rate).toBeNull();
  });

  it('al cerrar sesión retira inmediatamente el histórico', async () => {
    request.mockResolvedValue({ success: true, data: rate });
    const { result, rerender } = renderHook(({ enabled }) => useHistoricalRate(enabled, 'pair-a'), { initialProps: { enabled: true } });
    act(() => result.current.load(past));
    await waitFor(() => expect(result.current.rate).toEqual(rate));
    rerender({ enabled: false });
    expect(result.current.rate).toBeNull();
    expect(result.current.at).toBeNull();
  });

  it('un par sin identificador no consulta y explica el problema', async () => {
    const { result } = renderHook(() => useHistoricalRate(true, undefined));
    act(() => result.current.load(past));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(request).not.toHaveBeenCalled();
    expect(result.current.rate).toBeNull();
  });
});
