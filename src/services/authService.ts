import { LoginCredentials, RegisterData, User, AuthResponse, ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';

export class AuthService {
    private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
    async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: AuthResponse }>> {
      try {
        const response = await fetch(`${this.baseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({...credentials, username_or_email: credentials.email}),
        });
  
        if (response.ok) {
          const tokens: AuthResponse = await response.json();
          
          // Obtener información del usuario
          const userResponse = await fetch(`${this.baseUrl}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
            },
          });
  
          if (userResponse.ok) {
            const user: User = await userResponse.json();
            return { success: true, data: { user, tokens } };
          }
        }
        
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.detail || 'Error de autenticación' 
        };
      } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return { 
          success: false, 
          error: 'Error de conexión al servidor' 
        };
      }
    }
  
    async register(userData: RegisterData): Promise<ApiResponse<User>> {
      try {
        const response = await fetch(`${this.baseUrl}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
  
        if (response.ok) {
          const user: User = await response.json();
          return { success: true, data: user };
        }
        
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.detail || 'Error al registrarse' 
        };
      } catch (error) {
        console.error('Error al registrar usuario:', error);
        return { 
          success: false, 
          error: 'Error de conexión al servidor' 
        };
      }
    }
  
    async getCurrentUser(): Promise<ApiResponse<User>> {
      const result = await httpClient.get<User>('/auth/me');
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    }

    async refreshToken(refreshToken: string): Promise<ApiResponse<{ access_token: string }>> {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (response.ok) {
          const tokens: AuthResponse = await response.json();
          return { success: true, data: tokens };
        }
        
        return { success: false, error: 'Error al actualizar el token' };
      } catch (error) {
        console.error('Error al actualizar el token:', error);
        return { success: false, error: 'Error de conexión' };
      }
    }
  }