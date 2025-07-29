import { LucideIcon } from 'lucide-react';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'USER' | 'MODERATOR' | 'ROOT';
  is_verified: boolean;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<ApiResponse<User>>;
  register: (userData: RegisterData) => Promise<ApiResponse<User>>;
  logout: () => void;
  forceLogout: () => void;
  refreshToken: () => Promise<boolean>;
  loading: boolean;
  initializing: boolean;
  isAuthenticated: boolean;
}

export interface FormData {
  email: string;
  password: string;
  fullName: string;
  confirmPassword: string;
}

export interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
  confirmPassword?: string;
}

export interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

export interface InputFieldProps {
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon?: LucideIcon;
  placeholder?: string;
  required?: boolean;
}

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  children: React.ReactNode;
}