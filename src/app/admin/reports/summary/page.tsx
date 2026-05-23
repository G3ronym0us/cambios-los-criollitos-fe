'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { TrendingUp, Users } from 'lucide-react';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { BarChart3 } from 'lucide-react';
import { PeriodSelect } from './_components/PeriodSelect';
import { SummaryStats } from './_components/SummaryStats';
import { DistributionList, type DistributionRow } from './_components/DistributionList';
import { useSummaryReport } from './_hooks/useSummaryReport';

export default function SummaryReportPage() {
  const { state, actions } = useSummaryReport();
  const { summary, loading, lastDays } = state;

  const pairRows = useMemo<DistributionRow[]>(() => {
    if (!summary || summary.total_profit === 0) return [];
    return [...summary.by_currency_pair]
      .sort((a, b) => b.total_profit - a.total_profit)
      .map((pair) => ({
        key: pair.currency_pair,
        label: (
          <p className="truncate text-sm font-medium text-foreground sm:text-base">
            {pair.currency_pair}
          </p>
        ),
        transactionCount: pair.transaction_count,
        profit: pair.total_profit,
        percentage: (pair.total_profit / summary.total_profit) * 100,
      }));
  }, [summary]);

  const userRows = useMemo<DistributionRow[]>(() => {
    if (!summary || summary.total_profit === 0) return [];
    return [...summary.by_user]
      .sort((a, b) => b.total_profit - a.total_profit)
      .map((user) => ({
        key: user.user_uuid,
        label: (
          <Link
            href={`/admin/reports/users?user_uuid=${user.user_uuid}`}
            className="group flex items-center gap-3 min-w-0"
          >
            <div
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <span className="text-sm font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                {user.username}
              </p>
              <p className="text-xs text-muted-foreground group-hover:text-primary">
                Ver reporte →
              </p>
            </div>
          </Link>
        ),
        transactionCount: user.transaction_count,
        profit: user.total_profit,
        percentage: (user.total_profit / summary.total_profit) * 100,
      }));
  }, [summary]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen general"
        description="Estadísticas completas del sistema por período."
        actions={<PeriodSelect value={lastDays} onChange={actions.setLastDays} />}
      />

      {loading && !summary ? (
        <LoadingState label="Cargando resumen..." />
      ) : !summary ? (
        <EmptyState
          icon={BarChart3}
          title="Sin datos de resumen"
          description="No se pudo cargar el resumen. Intenta cambiar el período."
        />
      ) : (
        <>
          <SummaryStats summary={summary} />
          <DistributionList
            title="Distribución por par de monedas"
            icon={TrendingUp}
            rows={pairRows}
            barAccent="primary"
          />
          <DistributionList
            title="Distribución por usuario"
            icon={Users}
            rows={userRows}
            barAccent="success"
          />
        </>
      )}
    </div>
  );
}
