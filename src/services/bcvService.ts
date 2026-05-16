interface BCVResponse {
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

interface BCVRate {
  rate: number;
  lastUpdated: string;
}

class BCVService {
  private static instance: BCVService;
  private cache: BCVRate | null = null;
  private cacheExpiry: number = 0;
  private euroCache: BCVRate | null = null;
  private euroCacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  static getInstance(): BCVService {
    if (!BCVService.instance) {
      BCVService.instance = new BCVService();
    }
    return BCVService.instance;
  }

  async getBCVRate(): Promise<BCVRate | null> {
    try {
      if (this.cache && Date.now() < this.cacheExpiry) {
        return this.cache;
      }

      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BCVResponse = await response.json();

      const bcvRate: BCVRate = {
        rate: data.promedio,
        lastUpdated: data.fechaActualizacion
      };

      this.cache = bcvRate;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return bcvRate;
    } catch (error) {
      console.error('Error fetching BCV rate:', error);
      return this.cache;
    }
  }

  async getEuroRate(): Promise<BCVRate | null> {
    try {
      if (this.euroCache && Date.now() < this.euroCacheExpiry) {
        return this.euroCache;
      }

      const response = await fetch('https://ve.dolarapi.com/v1/euros/oficial');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BCVResponse = await response.json();

      const euroRate: BCVRate = {
        rate: data.promedio,
        lastUpdated: data.fechaActualizacion
      };

      this.euroCache = euroRate;
      this.euroCacheExpiry = Date.now() + this.CACHE_DURATION;

      return euroRate;
    } catch (error) {
      console.error('Error fetching BCV euro rate:', error);
      return this.euroCache;
    }
  }

  calculateBCVEquivalent(vesAmount: number, bcvRate: number): number {
    return vesAmount / bcvRate;
  }
}

export default BCVService;