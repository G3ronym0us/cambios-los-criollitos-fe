import { ArrowDownToLine, ArrowUpFromLine, MessageSquareText, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { OperationOrigin } from '@/types/operation';

export interface OperationOriginMeta {
  label: string;
  /** Para el `title`: lo que significa, en una frase. */
  hint: string;
  tone: 'neutral' | 'primary' | 'info';
  icon: LucideIcon;
}

/**
 * De dónde nació la cotización, para que al vincular se sepa si el monto salió de lo que el
 * cliente escribió o de un comprobante. `null` cuando no se sabe (no se pinta nada).
 */
export function getOriginMeta(origin: OperationOrigin | null | undefined): OperationOriginMeta | null {
  switch (origin) {
    case 'TEXT':
      return {
        label: 'Texto',
        hint: 'El bot la cotizó con lo que el cliente escribió',
        tone: 'neutral',
        icon: MessageSquareText,
      };
    case 'TEXT_RECEIPT':
      return {
        label: 'Texto + comprobante',
        hint: 'Cotizada por texto con un comprobante del cliente al lado: el monto salió de la captura',
        tone: 'primary',
        icon: Receipt,
      };
    case 'INCOMING_RECEIPT':
      return {
        label: 'Desde comprobante del cliente',
        hint: 'Creada a partir de un comprobante entrante',
        tone: 'info',
        icon: ArrowDownToLine,
      };
    case 'OUTGOING_RECEIPT':
      return {
        label: 'Desde nuestro pago',
        hint: 'Creada a partir de un comprobante saliente',
        tone: 'info',
        icon: ArrowUpFromLine,
      };
    default:
      return null;
  }
}
