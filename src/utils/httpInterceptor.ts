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

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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

  private async handleResponse<T>(response: Response): Promise<HttpResponse<T>> {
    try {
      // Manejar error 401 (No autorizado)
      if (response.status === 401) {
        this.handleUnauthorized();
        return {
          success: false,
          error: 'Sesión expirada. Redirigiendo al login...',
          redirectToLogin: true
        };
      }

      // Manejar otros errores HTTP
      if (!response.ok) {
        let errorMessage = 'Error del servidor';
        try {
          const errorData = await response.json();
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
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('Network error in GET request:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async post<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        ...(data && { body: JSON.stringify(data) }),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('Network error in POST request:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async put<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        ...(data && { body: JSON.stringify(data) }),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('Network error in PUT request:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        ...(data && { body: JSON.stringify(data) }),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('Network error in PATCH request:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }

  async delete<T>(endpoint: string): Promise<HttpResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('Network error in DELETE request:', error);
      return {
        success: false,
        error: 'Error de conexión al servidor'
      };
    }
  }
}

export const httpClient = HttpInterceptor.getInstance();