import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TransactionStatus } from '@/types/transaction';

type StatusMeta = {
  label: string;
  tone: 'success' | 'warning' | 'destructive' | 'neutral';
  icon: LucideIcon;
};

const STATUS_META: Record<TransactionStatus, StatusMeta> = {
  [TransactionStatus.COMPLETED]: { label: 'Completada', tone: 'success', icon: CheckCircle },
  [TransactionStatus.PENDING]: { label: 'Pendiente', tone: 'warning', icon: Clock },
  [TransactionStatus.CANCELLED]: { label: 'Cancelada', tone: 'neutral', icon: XCircle },
  [TransactionStatus.FAILED]: { label: 'Fallida', tone: 'destructive', icon: AlertCircle },
};

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
}

export function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const meta = STATUS_META[status] || STATUS_META[TransactionStatus.PENDING];
  return (
    <StatusBadge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </StatusBadge>
  );
}
