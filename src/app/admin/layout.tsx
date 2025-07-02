"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      if (user.role.toUpperCase() !== 'ROOT' && user.role.toUpperCase() !== 'MODERATOR') {
        router.push('/');
        return;
      }
    }
  }, [user, loading, initializing, router]);

  if (initializing || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user || (user.role.toUpperCase() !== 'ROOT' && user.role.toUpperCase() !== 'MODERATOR')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <div className="text-sm text-gray-600">
              Bienvenido, {user.full_name} ({user.role})
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}