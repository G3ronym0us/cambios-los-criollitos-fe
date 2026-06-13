
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <Image
            src="/logo.svg"
            alt="Cambios Los Criollitos"
            width={72}
            height={72}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Cambios Los Criollitos
          </h1>
          <p className="text-muted-foreground">
            Acceso de Administrador
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-card text-card-foreground border border-border rounded-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-muted-foreground">
              Ingresa tus credenciales de administrador
            </p>
          </div>

          {/* Mensaje de estado */}
          {message.text && (
            <div className={`
              p-4 rounded-lg mb-6 flex items-center space-x-2
              ${message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-destructive/10 border border-destructive/30 text-destructive'
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
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Panel de Administración — Cambios Los Criollitos</p>
        </div>
      </div>
    </div>
  );
};