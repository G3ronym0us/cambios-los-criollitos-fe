'use client';

import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlockErrorProps {
  /** "las divergencias", "los pagos" — completa "No se pudieron leer {module}". */
  module: string;
  onRetry: () => void;
  className?: string;
}

/**
 * Un bloque del agregado se cayó (llegó en `null` con su nombre en `errors`). El resto
 * del tablero sigue en pie: esto solo ocupa el sitio de SU franja, con su propio
 * "Reintentar" — pedir todo el `/admin/overview` de nuevo es lo único que hace falta,
 * porque es una sola llamada.
 */
export function BlockError({ module, onRetry, className }: BlockErrorProps) {
  return (
    <div
      className={`flex flex-col items-start gap-2 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-foreground">No se pudieron leer {module}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Las otras cifras están al día. Nada se perdió: la franja vuelve sola al reintentar.
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
        <RotateCw className="h-3.5 w-3.5" />
        Reintentar
      </Button>
    </div>
  );
}
