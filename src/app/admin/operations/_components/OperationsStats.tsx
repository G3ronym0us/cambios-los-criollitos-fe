import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { OperationStats } from '@/types/operation';

interface OperationsStatsProps {
  stats: OperationStats;
}

export function OperationsStats({ stats }: OperationsStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <StatCard icon={FileText} label="Cotizadas" value={stats.quoted} accent="info" />
      <StatCard icon={Clock} label="Pendientes" value={stats.pending} accent="warning" />
      <StatCard icon={CheckCircle2} label="Completadas" value={stats.completed} accent="success" />
      <StatCard icon={XCircle} label="Canceladas" value={stats.cancelled} accent="destructive" />
    </div>
  );
}
