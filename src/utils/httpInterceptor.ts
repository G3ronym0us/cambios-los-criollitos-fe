import Cookies from 'js-cookie';

export interface HttpResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  redirectToLogin?: boolean;
}

export class HttpInterceptor {
  private static instance: HttpInterceptor;
  private baseUrl: string;
  private onUnauthorized?: () => void;
  private onRefreshToken?: () => Promise<boolean>;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    console.log('[HttpInterceptor] Constructor called');
    console.log('[HttpInterceptor] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('[HttpInterceptor] Final baseUrl:', this.baseUrl);
  }

  static getInstance(): HttpInterceptor {
    if (!HttpInterceptor.instance) {
      HttpInterceptor.instance = new HttpInterceptor();
    }
    return HttpInterceptor.instance;
  }

  setUnauthorizedHandler(handler: () => void): void {
    this.onUnauthorized = handler;
  }

  setRefreshTokenHandler(handler: () => Promise<boolean>): void {
    this.onRefreshToken = handler;
  }

  private getAuthHeaders() {
    const token = Cookies.get('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private handleUnauthorized(): void {
    // Limpiar tokens
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    
    // Usar el handler personalizado si está disponible
    if (this.onUnauthorized) {
      this.onUnauthorized();
    } else {
      // Fallback: redirigir directamente si no hay handler
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
        window.location.href = '/auth/login';
      }
    }
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<HttpResponse<T>> {
    const makeRequest = () => fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: this.getAuthHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    try {
      let response = await makeRequest();

      if (response.status === 401) {
        if (this.onRefreshToken) {
          const refreshed = await this.onRefreshToken();
          if (refreshed) {
            response = await makeRequest();
          }
        }
        if (response.status === 401) {
          this.handleUnauthorized();
          return { success: false, error: 'Sesión expirada. Redirigiendo al login...', redirectToLogin: true };
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`[HttpInterceptor] Network error in ${method} request:`, error);
      return { success: false, error: 'Error de conexión al servidor' };
    }
  }

  private async handleResponse<T>(response: Response): Promise<HttpResponse<T>> {
    try {
      // Manejar otros errores HTTP
      if (!response.ok) {
        let errorMessage = 'Error del servidor';
        try {
          const errorData = await response.json();

          // Si es una advertencia de transacción similar, devolver el JSON completo
          if (errorData.requires_confirmation && errorData.similar_transaction) {
            return {
              success: false,
              error: JSON.stringify(errorData)
            };
          }

          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Si no se puede parsear el error, usar el status
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      // Respuesta exitosa
      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error processing response:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async get<T>(endpoint: string): Promise<HttpResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', endpoint, data);
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', endpoint, data);
  }

  async delete<T>(endpoint: string): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }
}

export const httpClient = HttpInterceptor.getInstance();