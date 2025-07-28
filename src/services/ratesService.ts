import Cookies from 'js-cookie';
import { ApiResponse } from '@/types/auth';

export interface ExchangeRateResponse {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: string;
  is_active: boolean;
  percentage: number | null;
  inverse_percentage: boolean;
  created_at: string;
  updated_at: string | null;
}

export class RatesService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  private getAuthHeaders() {
    const token = Cookies.get('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getLatestRatesByCurrencies(
    fromCurrency: string, 
    toCurrency: string, 
    limit: number = 10
  ): Promise<ApiResponse<ExchangeRateResponse[]>> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });

      const response = await fetch(
        `${this.baseUrl}/rates/latest/${fromCurrency.toUpperCase()}/${toCurrency.toUpperCase()}?${params}`, 
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data: ExchangeRateResponse[] = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener las tasas históricas'
      };
    } catch (error) {
      console.error('Error fetching latest rates:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async getLatestRatesByPairSymbol(
    pairSymbol: string, 
    limit: number = 10
  ): Promise<ApiResponse<ExchangeRateResponse[]>> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });

      const response = await fetch(
        `${this.baseUrl}/rates/pair/${pairSymbol.toUpperCase()}/latest?${params}`, 
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data: ExchangeRateResponse[] = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener las tasas históricas'
      };
    } catch (error) {
      console.error('Error fetching latest rates by pair symbol:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  createPairSymbol(fromCurrency: string, toCurrency: string): string {
    return `${fromCurrency.toUpperCase()}-${toCurrency.toUpperCase()}`;
  }

  formatRateDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

export const ratesService = new RatesService();