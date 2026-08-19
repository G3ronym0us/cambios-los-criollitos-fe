import { CurrencyType } from '@/types/admin';
import { cn } from '@/lib/utils';

const TONE_BY_TYPE: Record<string, string> = {
  [CurrencyType.FIAT]: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  [CurrencyType.CRYPTO]: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
};

/**
 * El tipo de una moneda, en una pieza sola.
 *
 * No es decoración: el tipo es lo que decide si un par puede ser base (Binance solo cotiza
 * FIAT contra CRYPTO), así que se repite tal cual en el desplegable, en la fila del listado
 * y en el detalle. Un solo prop, para que no se despeguen entre sí.
 */
export function CurrencyTypeChip({
  type,
  className,
}: {
  type?: CurrencyType | null;
  className?: string;
}) {
  const label = type ?? 'SIN TIPO';
  return (
    <span
      className={cn(
        'shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide',
        TONE_BY_TYPE[label] ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {label}
    </span>
  );
}
