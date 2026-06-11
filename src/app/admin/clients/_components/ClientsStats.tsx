import { Ban, Contact, Eye } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface ClientsStatsProps {
  stats: { total: number; blocked: number; tracked: number };
}

export function ClientsStats({ stats }: ClientsStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <StatCard icon={Contact} label="Clientes" value={stats.total} accent="primary" compact />
      <StatCard icon={Eye} label="Seguidos" value={stats.tracked} accent="info" compact />
      <StatCard icon={Ban} label="Bloqueados" value={stats.blocked} accent="destructive" compact />
    </div>
  );
}
