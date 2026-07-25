import { Coins, Users, Wallet } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { formatUSDT } from '../_lib/format';

interface GroupSummaryProps {
  activeCount: number;
  totalPosition: number;
  totalMembers: number;
  loadingPosition: boolean;
}

/** Cabecera de estadísticas de la pantalla de listado (grupos activos, posición y miembros). */
export function GroupSummary({
  activeCount,
  totalPosition,
  totalMembers,
  loadingPosition,
}: GroupSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <StatCard icon={Wallet} label="Grupos activos" value={activeCount} accent="primary" />
      {loadingPosition ? (
        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-5">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-7 w-32 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <StatCard
          icon={Coins}
          label="Posición total"
          value={`${formatUSDT(totalPosition)} USDT`}
          accent="success"
        />
      )}
      <StatCard icon={Users} label="Miembros totales" value={totalMembers} accent="info" />
    </div>
  );
}
