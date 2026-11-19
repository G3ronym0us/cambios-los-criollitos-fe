import { beforeEach, describe, expect, it, vi } from 'vitest';
import BCVService from './bcvService';
import { httpClient } from '@/utils/httpInterceptor';

vi.mock('@/utils/httpInterceptor', () => ({ httpClient: { get: vi.fn() } }));

const get = vi.mocked(httpClient.get);

const response = (currency: string, rate: number) => ({
  success: true as const,
  data: { currency, rate, source: 'test', fetched_at: '2025-06-10T10:00:00Z' },
});

describe('BCV que sirve el backend', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('pide la tasa vigente de la moneda elegida', async () => {
    get.mockResolvedValue(response('EUR', 410));

    const rate = await new BCVService().getEuroRate();

    expect(get).toHaveBeenCalledWith('/bcv?currency=EUR');
    expect(rate).toEqual({ rate: 410, lastUpdated: '2025-06-10T10:00:00Z' });
  });

  it('pide la tasa histórica con la fecha y la moneda', async () => {
    get.mockResolvedValue(response('USD', 240));

    const rate = await new BCVService().getHistoricalBCVRate('2025-06-10T14:30:00.000Z', 'USD');

    expect(get).toHaveBeenCalledWith(
      '/bcv/historical?at=2025-06-10T14%3A30%3A00.000Z&currency=USD',
    );
    expect(rate).toEqual({ rate: 240, lastUpdated: '2025-06-10T10:00:00Z' });
  });

  it('devuelve null cuando no hay tasa registrada a esa fecha', async () => {
    get.mockResolvedValue({ success: false, error: 'No hay una tasa BCV USD registrada' });

    await expect(
      new BCVService().getHistoricalBCVRate('2025-06-10T14:30:00.000Z'),
    ).resolves.toBeNull();
  });
});
