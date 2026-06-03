import { Ban, Contact, Eye } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface ClientsStatsProps {
  stats: { total: number; blocked: number; tracked: number };
}

export function ClientsStats({ stats }: ClientsStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <StatCard icon={Contact} label="Total Clientes" value={stats.total} accent="primary" />
      <StatCard icon={Eye} label="Seguidos" value={stats.tracked} accent="info" />
      <StatCard icon={Ban} label="Bloqueados" value={stats.blocked} accent="destructive" />
    </div>
  );
}
