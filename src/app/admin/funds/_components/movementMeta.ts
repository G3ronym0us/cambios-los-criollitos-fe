import { ArrowDownLeft, ArrowDownToLine, CircleHelp, RefreshCw, Settings, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MovementType } from '@/types/fund';

export interface MovementMeta {
  label: string;
  tone: 'success' | 'info' | 'warning' | 'neutral';
  icon: LucideIcon;
}

export const MOVEMENT_META: Record<MovementType, MovementMeta> = {
  [MovementType.DEPOSIT]: { label: 'Depósito', tone: 'success', icon: ArrowDownToLine },
  // Las dos patas del cambio: la operación mueve dos fondos y cada uno registra la suya.
  // Sin distinguirlas en la etiqueta, dos líneas de sentido opuesto se leían igual («Cambio»).
  [MovementType.EXCHANGE]: { label: 'Cambio (salida)', tone: 'info', icon: RefreshCw },
  [MovementType.EXCHANGE_IN]: { label: 'Cambio (entrada)', tone: 'success', icon: ArrowDownLeft },
  [MovementType.PERSONAL]: { label: 'Personal', tone: 'warning', icon: Wallet },
  [MovementType.ADJUSTMENT]: { label: 'Ajuste', tone: 'neutral', icon: Settings },
};

export const MOVEMENT_LABELS = Object.fromEntries(
  Object.entries(MOVEMENT_META).map(([type, meta]) => [type, meta.label]),
) as Record<MovementType, string>;

/**
 * Meta de un tipo que el front puede no conocer todavía.
 *
 * El backend agrega tipos por su cuenta (así llegó `EXCHANGE_IN`) y arrastra data legacy en
 * minúscula. Con el acceso directo al mapa, una sola fila así tumbaba la pantalla entera del
 * fondo con «can't access property "tone"». Aquí el caso se normaliza y lo desconocido cae en
 * una insignia neutra que muestra el tipo crudo, en vez de romper el render.
 */
export function movementMeta(type: string | null | undefined): MovementMeta {
  if (!type) return { label: 'Movimiento', tone: 'neutral', icon: CircleHelp };
  return (
    MOVEMENT_META[type.toUpperCase() as MovementType] ?? {
      label: type,
      tone: 'neutral',
      icon: CircleHelp,
    }
  );
}
