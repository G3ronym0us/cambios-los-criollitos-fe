import { Bitcoin, Coins, Landmark } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface CurrenciesStatsProps {
  stats: { total: number; crypto: number; fiat: number };
}

export function CurrenciesStats({ stats }: CurrenciesStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <StatCard icon={Coins} label="Total Monedas" value={stats.total} accent="primary" />
      <StatCard icon={Bitcoin} label="Criptomonedas" value={stats.crypto} accent="warning" />
      <StatCard icon={Landmark} label="Monedas Fiat" value={stats.fiat} accent="success" />
    </div>
  );
}
