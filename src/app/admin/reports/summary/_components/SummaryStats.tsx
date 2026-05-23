import { DollarSign, Repeat, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { ProfitSummary } from '@/types/transaction';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface SummaryStatsProps {
  summary: ProfitSummary;
}

export function SummaryStats({ summary }: SummaryStatsProps) {
  const average =
    summary.total_transactions > 0
      ? summary.total_profit / summary.total_transactions
      : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <StatCard
        icon={DollarSign}
        label="Ganancia total"
        value={formatCurrency(summary.total_profit)}
        hint={`En ${summary.total_transactions} transacciones`}
        accent="success"
      />
      <StatCard
        icon={Repeat}
        label="Transacciones"
        value={summary.total_transactions}
        hint={`Promedio: ${formatCurrency(average)}`}
        accent="primary"
      />
      <StatCard
        icon={TrendingUp}
        label="Pares activos"
        value={summary.by_currency_pair.length}
        hint={`${summary.by_user.length} usuarios con ganancia`}
        accent="info"
      />
    </div>
  );
}
