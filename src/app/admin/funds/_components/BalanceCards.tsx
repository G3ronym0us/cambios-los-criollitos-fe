import { DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import type { GroupBalance } from '@/types/fund';

function formatUSDT(value: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface BalanceCardsProps {
  balance: GroupBalance | null;
  loading: boolean;
}

export function BalanceCards({ balance, loading }: BalanceCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!balance) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <StatCard
        icon={DollarSign}
        label="Total posición"
        value={`${formatUSDT(balance.total_position_usdt)} USDT`}
        hint="Depósitos − Salidas"
        accent="primary"
      />
      <StatCard
        icon={TrendingUp}
        label="Ganancias acumuladas"
        value={`${formatUSDT(balance.total_profit_usdt)} USDT`}
        hint="De transacciones completadas"
        accent="success"
      />
      <StatCard
        icon={Wallet}
        label="Fondos disponibles"
        value={`${formatUSDT(balance.available_funds_usdt)} USDT`}
        hint="Acumuladas − Total posición"
        accent="info"
      />
    </div>
  );
}
