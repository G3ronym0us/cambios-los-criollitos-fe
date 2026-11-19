import { httpClient } from '@/utils/httpInterceptor';

export type BcvCurrency = 'USD' | 'EUR';

interface BCVResponse {
  currency: string;
  rate: number;
  source: string;
  fetched_at: string;
}

interface BCVRate {
  rate: number;
  lastUpdated: string;
}

/**
 * Tasas oficiales del BCV que sirve el backend.
 *
 * Antes se consultaba ve.dolarapi.com directo desde el navegador, pero esa API
 * solo entrega el valor de hoy: para cotizar un monto de ayer hace falta la
 * serie que el backend ya persiste en `bcv_rates` (y que refresca cada 5 min).
 */
class BCVService {
  private static instance: BCVService;
  private cache: Partial<Record<BcvCurrency, { value: BCVRate; expiresAt: number }>> = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  static getInstance(): BCVService {
    if (!BCVService.instance) {
      BCVService.instance = new BCVService();
    }
    return BCVService.instance;
  }

  getBCVRate(): Promise<BCVRate | null> {
    return this.getRate('USD');
  }

  getEuroRate(): Promise<BCVRate | null> {
    return this.getRate('EUR');
  }

  async getRate(currency: BcvCurrency): Promise<BCVRate | null> {
    const cached = this.cache[currency];
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const result = await httpClient.get<BCVResponse>(`/bcv?currency=${currency}`);
    if (!result.success || !result.data) {
      // Si el backend no responde, se conserva lo último que sí llegó.
      return cached?.value ?? null;
    }

    const value: BCVRate = {
      rate: result.data.rate,
      lastUpdated: result.data.fetched_at,
    };
    this.cache[currency] = { value, expiresAt: Date.now() + this.CACHE_DURATION };
    return value;
  }

  /**
   * Tasa que REGÍA en `at` (ISO-8601), no la de hoy: cotizar hacia atrás con
   * el BCV actual cambia el trato del comprobante.
   */
  async getHistoricalBCVRate(at: string, currency: BcvCurrency = 'USD'): Promise<BCVRate | null> {
    const params = new URLSearchParams({ at, currency });
    const result = await httpClient.get<BCVResponse>(`/bcv/historical?${params}`);
    if (!result.success || !result.data) {
      return null;
    }
    return {
      rate: result.data.rate,
      lastUpdated: result.data.fetched_at,
    };
  }

  calculateBCVEquivalent(vesAmount: number, bcvRate: number): number {
    return vesAmount / bcvRate;
  }
}

export default BCVService;
