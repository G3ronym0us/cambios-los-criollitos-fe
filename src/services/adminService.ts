import Cookies from 'js-cookie';
import { 
  CurrencyData, 
  CreateCurrencyData, 
  CurrencyAdminResponse,
  CurrencyPairData,
  CreateCurrencyPairData,
  UpdateCurrencyPairData,
  CurrencyPairStatusData,
  CurrencyPairsResponse,
  CurrencyPairStatsResponse,
  BinanceTradeMethod,
  BinanceTradeMethodsResponse,
  BinanceFilterConditionsResponse,
  ManualRateData
} from '@/types/admin';
import { ApiResponse } from '@/types/auth';

export class AdminService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  private getAuthHeaders() {
    const token = Cookies.get('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getCurrencies(page: number = 1, per_page: number = 10): Promise<ApiResponse<CurrencyAdminResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/currencies?page=${page}&per_page=${per_page}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data: CurrencyAdminResponse = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener las monedas'
      };
    } catch (error) {
      console.error('Error fetching currencies:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async createCurrency(currencyData: CreateCurrencyData): Promise<ApiResponse<CurrencyData>> {
    try {
      const response = await fetch(`${this.baseUrl}/currencies`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(currencyData),
      });

      if (response.ok) {
        const data: CurrencyData = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al crear la moneda'
      };
    } catch (error) {
      console.error('Error creating currency:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async updateCurrency(id: number, currencyData: Partial<CreateCurrencyData>): Promise<ApiResponse<CurrencyData>> {
    try {
      const response = await fetch(`${this.baseUrl}/currencies/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(currencyData),
      });

      if (response.ok) {
        const data: CurrencyData = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al actualizar la moneda'
      };
    } catch (error) {
      console.error('Error updating currency:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async deleteCurrency(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/currencies/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al eliminar la moneda'
      };
    } catch (error) {
      console.error('Error deleting currency:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async toggleCurrencyStatus(id: number): Promise<ApiResponse<CurrencyData>> {
    try {
      const response = await fetch(`${this.baseUrl}/currencies/${id}/toggle-status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data: CurrencyData = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al cambiar el estado de la moneda'
      };
    } catch (error) {
      console.error('Error toggling currency status:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  // Currency Pairs Methods
  async getCurrencyPairs(skip: number = 0, limit: number = 100, activeOnly: boolean = false, monitoredOnly: boolean = false): Promise<ApiResponse<CurrencyPairsResponse>> {
    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        ...(activeOnly && { active_only: 'true' }),
        ...(monitoredOnly && { monitored_only: 'true' })
      });

      const response = await fetch(`${this.baseUrl}/currency-pairs/?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data: CurrencyPairsResponse = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener los pares de monedas'
      };
    } catch (error) {
      console.error('Error fetching currency pairs:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async createCurrencyPair(pairData: CreateCurrencyPairData): Promise<ApiResponse<CurrencyPairData>> {
    try {
      const response = await fetch(`${this.baseUrl}/currency-pairs/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(pairData),
      });

      if (response.ok) {
        const data: CurrencyPairData = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al crear el par de monedas'
      };
    } catch (error) {
      console.error('Error creating currency pair:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async updateCurrencyPair(id: number, pairData: UpdateCurrencyPairData): Promise<ApiResponse<CurrencyPairData>> {
    try {
      const response = await fetch(`${this.baseUrl}/currency-pairs/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(pairData),
      });

      if (response.ok) {
        const data: CurrencyPairData = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al actualizar el par de monedas'
      };
    } catch (error) {
      console.error('Error updating currency pair:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async updateCurrencyPairStatus(id: number, statusData: CurrencyPairStatusData): Promise<ApiResponse<CurrencyPairData>> {
    try {
      const response = await fetch(`${this.baseUrl}/currency-pairs/${id}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(statusData),
      });

      if (response.ok) {
        const data: CurrencyPairData = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al actualizar el estado del par'
      };
    } catch (error) {
      console.error('Error updating currency pair status:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async getBinanceTrackedPairs(): Promise<ApiResponse<CurrencyPairData[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/currency-pairs/binance-tracked`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data: CurrencyPairData[] = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener los pares de Binance'
      };
    } catch (error) {
      console.error('Error fetching Binance tracked pairs:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async deleteCurrencyPair(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/currency-pairs/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al eliminar el par de monedas'
      };
    } catch (error) {
      console.error('Error deleting currency pair:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async getCurrencyPairStats(): Promise<ApiResponse<CurrencyPairStatsResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/currency-pairs/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data: CurrencyPairStatsResponse = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener las estadísticas'
      };
    } catch (error) {
      console.error('Error fetching currency pair stats:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async getMonitoredCurrencyPairs(): Promise<ApiResponse<CurrencyPairData[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/currency-pairs/monitored`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data: CurrencyPairData[] = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener los pares monitoreados'
      };
    } catch (error) {
      console.error('Error fetching monitored currency pairs:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  // Binance Trade Methods
  async getBinanceTradeMethodsByUrl(fiatCurrency: string): Promise<ApiResponse<BinanceTradeMethod[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/binance/trade-methods/${fiatCurrency}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data: BinanceTradeMethod[] = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener métodos de pago de Binance'
      };
    } catch (error) {
      console.error('Error fetching Binance trade methods:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async getBinanceTradeMethodsByPost(fiatCurrency: string): Promise<ApiResponse<BinanceTradeMethodsResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/binance/trade-methods`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ fiat_currency: fiatCurrency }),
      });

      if (response.ok) {
        const data: BinanceTradeMethodsResponse = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener métodos de pago de Binance'
      };
    } catch (error) {
      console.error('Error fetching Binance trade methods:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async getBinanceFilterConditions(fiatCurrency: string): Promise<ApiResponse<BinanceFilterConditionsResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/binance/filter-conditions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ fiat_currency: fiatCurrency }),
      });

      if (response.ok) {
        const data: BinanceFilterConditionsResponse = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al obtener condiciones de filtro de Binance'
      };
    } catch (error) {
      console.error('Error fetching Binance filter conditions:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  // Manual Rate Management Methods
  async setManualRate(fromCurrency: string, toCurrency: string, manualRate: number): Promise<ApiResponse<ManualRateData>> {
    try {
      const response = await fetch(`${this.baseUrl}/rates/manual/${fromCurrency}/${toCurrency}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ manual_rate: manualRate }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al establecer precio manual'
      };
    } catch (error) {
      console.error('Error setting manual rate:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async removeManualRate(fromCurrency: string, toCurrency: string): Promise<ApiResponse<ManualRateData>> {
    try {
      const response = await fetch(`${this.baseUrl}/rates/manual/${fromCurrency}/${toCurrency}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.detail || 'Error al remover precio manual'
      };
    } catch (error) {
      console.error('Error removing manual rate:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }
}