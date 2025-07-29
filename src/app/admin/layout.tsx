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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-2 sm:gap-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <div className="text-xs sm:text-sm text-gray-600">
              Bienvenido, <span className="font-medium">{user.full_name}</span> ({user.role})
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}