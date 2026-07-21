import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonRowProps {
  /** Qué se está comparando (ej. "Cliente envía 100 USDT"). */
  label: string;
  /** Valor sin la configuración aplicada. */
  before: React.ReactNode;
  /** Valor con la configuración aplicada. */
  after: React.ReactNode;
  /** Aclaración opcional bajo la fila (ej. por qué no cambió). */
  hint?: string;
  /** Atenúa la fila cuando la configuración no la afecta. */
  muted?: boolean;
  className?: string;
}

/**
 * Fila "antes → después" para previsualizar el efecto de una configuración.
 * Mobile-first: en pantallas chicas los valores se apilan bajo la etiqueta.
 */
export function ComparisonRow({
  label,
  before,
  after,
  hint,
  muted = false,
  className,
}: ComparisonRowProps) {
  return (
    <div className={cn('space-y-1 border-b border-border/60 py-2 last:border-0', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className={cn('tabular-nums', muted ? 'text-foreground' : 'text-muted-foreground line-through')}>
          {before}
        </span>
        {muted ? null : (
          <>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-medium tabular-nums text-foreground">{after}</span>
          </>
        )}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
