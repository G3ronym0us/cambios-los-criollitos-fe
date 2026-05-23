import { AlertCircle, Bell } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface AlertsStatsProps {
  stats: { total: number; unseen: number };
}

export function AlertsStats({ stats }: AlertsStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <StatCard icon={Bell} label="Total alertas" value={stats.total} accent="primary" />
      <StatCard
        icon={AlertCircle}
        label="No vistas"
        value={stats.unseen}
        accent={stats.unseen > 0 ? 'warning' : 'muted'}
      />
    </div>
  );
}
