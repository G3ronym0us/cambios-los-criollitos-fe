import { DollarSign, FileText } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface ProfitStatsProps {
  totalProfit: number;
  transactionCount: number;
  profitHint?: string;
}

export function ProfitStats({ totalProfit, transactionCount, profitHint }: ProfitStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <StatCard
        icon={DollarSign}
        label="Ganancia total"
        value={formatCurrency(totalProfit)}
        hint={profitHint}
        accent="success"
      />
      <StatCard
        icon={FileText}
        label="Transacciones"
        value={transactionCount}
        accent="primary"
      />
    </div>
  );
}
