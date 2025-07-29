
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { AuthService } from '@/services/authService';
import { httpClient } from '@/utils/httpInterceptor';
import { 
  AuthContextType, 
  User, 
  LoginCredentials, 
  RegisterData, 
  ApiResponse 
} from '@/types/auth';

const authService = new AuthService();

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);
  const router = useRouter();

  // Verificar si hay una sesión activa al cargar la app
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = Cookies.get('access_token');
        if (token) {
          const result = await authService.getCurrentUser();
          if (result.success && result.data) {
            setUser(result.data);
          } else {
            // Token inválido, limpiar cookies
            Cookies.remove('access_token');
            Cookies.remove('refresh_token');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Limpiar tokens en caso de error
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
      } finally {
        setInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<ApiResponse<User>> => {
    setLoading(true);
    try {
      const result = await authService.login(credentials);
      
      if (result.success && result.data) {
        const { user, tokens } = result.data;
        
        // Guardar tokens en cookies (httpOnly para mejor seguridad)
        Cookies.set('access_token', tokens.access_token, { 
          expires: 7, // 7 días
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        Cookies.set('refresh_token', tokens.refresh_token, { 
          expires: 30, // 30 días
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        
        setUser(user);
        return { success: true, data: user };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error during login:', error);
      return { success: false, error: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<ApiResponse<User>> => {
    setLoading(true);
    try {
      const result = await authService.register(userData);
      return result;
    } catch (error) {
      console.error('Error during registration:', error);
      return { success: false, error: 'Error al registrar usuario' };
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    setUser(null);
  };

  const forceLogout = useCallback((): void => {
    logout();
    // Solo redirigir si no estamos ya en la página de login
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
      router.push('/auth/login');
    }
  }, [router]);

  // Configurar el handler de 401 en el interceptor HTTP
  useEffect(() => {
    httpClient.setUnauthorizedHandler(forceLogout);
  }, [forceLogout]);

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = Cookies.get('refresh_token');
      if (!refreshTokenValue) return false;

      const result = await authService.refreshToken(refreshTokenValue);
      if (result.success && result.data) {
        Cookies.set('access_token', result.data.access_token, { 
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        return true;
      }
      
      // Refresh token inválido, hacer logout
      logout();
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    forceLogout,
    refreshToken,
    loading,
    initializing,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};