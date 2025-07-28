
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InputField } from './InputField';
import { LoadingButton } from './LoadingButton';
import { Message } from '@/types/auth';
import { validateEmail } from '@/utils/validation';

export const LoginForm: React.FC = () => {
  const { login, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<{email: string, password: string}>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{email?: string, password?: string}>({});
  const [message, setMessage] = useState<Message>({ type: '', text: '' });

  const handleInputChange = (field: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {email?: string, password?: string} = {};
    
    // Validar email
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    // Validar contraseña
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) return;

    setMessage({ type: '', text: '' });

    try {
      const result = await login({
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        setMessage({
          type: 'success',
          text: '¡Bienvenido Administrador!'
        });
        
        // Redirigir al admin después de login exitoso
        setTimeout(() => {
          router.push('/admin');
        }, 1000);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Credenciales incorrectas'
        });
      }
    } catch (error) {
      console.error('Error en submit:', error);
      setMessage({
        type: 'error',
        text: 'Error de conexión'
      });
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Tasas Project
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Acceso de Administrador
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-sm bg-opacity-95">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Ingresa tus credenciales de administrador
            </p>
          </div>

          {/* Mensaje de estado */}
          {message.text && (
            <div className={`
              p-4 rounded-lg mb-6 flex items-center space-x-2
              ${message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
              }
            `}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Email */}
            <InputField
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              icon={Mail}
              placeholder="admin@tasasproject.com"
              required
            />

            {/* Contraseña */}
            <InputField
              label="Contraseña"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              icon={Lock}
              placeholder="Contraseña de administrador"
              required
            />

            {/* Botón de envío */}
            <LoadingButton loading={loading} onClick={handleSubmit}>
              Iniciar Sesión
            </LoadingButton>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Panel de Administración - Tasas Project</p>
        </div>
      </div>
    </div>
  );
};