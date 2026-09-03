'use client';

import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { liveAgo } from '../_lib/overviewFormat';

interface OverviewHeaderProps {
  needsAttention: number | null;
  generatedAt: string | null;
  loading: boolean;
  onRefresh: () => void;
}

function greeting(needsAttention: number | null): string {
  if (needsAttention == null) return 'Panel de administración';
  if (needsAttention === 0) return 'Hoy no hay comprobantes esperando decisión';
  return needsAttention === 1
    ? 'Hoy hay 1 comprobante esperando decisión'
    : `Hoy hay ${needsAttention} comprobantes esperando decisión`;
}

/** "martes 2 de septiembre" — sin año, como en el diseño. */
function longDate(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * El saludo con el reloj en vivo: "hace 40 s" avanza solo entre refrescos (el propio dato
 * no cambia, solo la etiqueta de cuánto hace que se pidió), así que el tablero se siente
 * vivo aunque no haya novedades.
 */
export function OverviewHeader({ needsAttention, generatedAt, loading, onRefresh }: OverviewHeaderProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-1">
        {loading && needsAttention == null ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {greeting(needsAttention)}
          </h1>
        )}
        <p className="text-xs text-muted-foreground sm:text-sm">
          {longDate()} · en vivo, {liveAgo(generatedAt)}
        </p>
      </div>

      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="shrink-0">
        <RotateCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
        Actualizar
      </Button>
    </header>
  );
}
