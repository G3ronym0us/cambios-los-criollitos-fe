import Cookies from 'js-cookie';
import { CurrencyData, CreateCurrencyData, CurrencyAdminResponse } from '@/types/admin';
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
}