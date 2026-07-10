import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { OperationStatus } from '@/types/operation';

type StatusTone = 'info' | 'warning' | 'success' | 'destructive';

export interface OperationStatusMeta {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

// Mapeo único estado→tono/icono/label, reutilizado por OperationItem, PaymentItem y el detalle.
export function getStatusMeta(status: OperationStatus | null | undefined): OperationStatusMeta {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Completada', tone: 'success', icon: CheckCircle2 };
    case 'CANCELLED':
      return { label: 'Cancelada', tone: 'destructive', icon: XCircle };
    case 'PENDING':
      return { label: 'Pendiente', tone: 'warning', icon: Clock };
    case 'QUOTED':
    default:
      return { label: 'Cotizada', tone: 'info', icon: FileText };
  }
}
