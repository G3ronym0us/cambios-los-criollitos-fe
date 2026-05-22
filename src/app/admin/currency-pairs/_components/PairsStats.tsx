import { ArrowLeftRight, CheckCircle2, Eye } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface PairsStatsProps {
  stats: { total_pairs: number; active_pairs: number; monitored_pairs: number } | null;
}

export function PairsStats({ stats }: PairsStatsProps) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <StatCard icon={ArrowLeftRight} label="Total Pares" value={stats.total_pairs} accent="primary" />
      <StatCard icon={CheckCircle2} label="Pares Activos" value={stats.active_pairs} accent="success" />
      <StatCard icon={Eye} label="Monitoreados" value={stats.monitored_pairs} accent="info" />
    </div>
  );
}
