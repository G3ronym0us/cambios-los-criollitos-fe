"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import CurrencyCalculator from '../components/CurrencyCalculator';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { EmptyState } from '@/components/shared/EmptyState';
import { LogoLoader } from '@/components/shared/LogoLoader';
import { ratesService } from '@/services/ratesService';
import { ExchangeRateResponse } from '@/types/currency';
import { Role } from '@/utils/enums';
import { cn } from '@/lib/utils';

const ExchangeRatesDashboard = () => {
  const { user } = useAuth();
  const [rates, setRates] = useState<ExchangeRateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const result = await ratesService.getAllActiveRates();
    if (result.success && result.data) {
      setRates(result.data);
    } else {
      setError(result.error || 'Error al cargar las tasas de cambio');
    }
    setLoading(false);
  }, []);

  // Cargar datos al iniciar
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  if (loading && rates.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <LogoLoader label="Cargando tasas..." />
      </div>
    );
  }

  if (error && rates.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <EmptyState
          icon={AlertTriangle}
          title="No se pudieron cargar las tasas"
          description={error}
          className="w-full max-w-md"
          actions={
            <Button variant="outline" size="lg" onClick={fetchRates} className="min-h-11">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header compacto */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Image src="/logo.svg" alt="Cambios Los Criollitos" width={40} height={40} className="shrink-0" />
              <div>
                <h1 className="text-lg font-bold text-foreground sm:text-xl lg:text-2xl">
                  Cambios Los Criollitos
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Tasas de cambio en tiempo real
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={fetchRates}
                disabled={loading}
                title="Actualizar tasas"
                className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/15 disabled:opacity-50 sm:px-4 sm:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} aria-hidden />
                <span className="hidden font-medium sm:inline">
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </span>
              </button>

              {user && (user.role === Role.ROOT || user.role === Role.MODERATOR) && (
                <Link
                  href="/admin"
                  title="Administración"
                  className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-secondary p-2 text-secondary-foreground transition-colors hover:bg-secondary/80 sm:px-4 sm:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Settings className="h-5 w-5" aria-hidden />
                  <span className="hidden font-medium lg:inline">Admin</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal - Solo calculadora */}
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-4xl">
          <CurrencyCalculator rates={rates} user={user} onRateUpdated={fetchRates} />
        </div>
      </div>
    </div>
  );
};

export default ExchangeRatesDashboard;
