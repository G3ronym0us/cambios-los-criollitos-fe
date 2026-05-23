import { CircleDollarSign, Users } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface UsersStatsProps {
  stats: { total: number; commissioners: number };
}

export function UsersStats({ stats }: UsersStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <StatCard icon={Users} label="Total Usuarios" value={stats.total} accent="primary" />
      <StatCard
        icon={CircleDollarSign}
        label="Comisionistas"
        value={stats.commissioners}
        accent="success"
      />
    </div>
  );
}
