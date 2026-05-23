'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export interface DistributionRow {
  key: string;
  label: ReactNode;
  transactionCount: number;
  profit: number;
  percentage: number;
}

interface DistributionListProps {
  title: string;
  icon: LucideIcon;
  rows: DistributionRow[];
  emptyText?: string;
  barAccent?: 'primary' | 'success';
}

const barAccentClass: Record<NonNullable<DistributionListProps['barAccent']>, string> = {
  primary: 'bg-primary',
  success: 'bg-emerald-500 dark:bg-emerald-400',
};

export function DistributionList({
  title,
  icon: Icon,
  rows,
  emptyText = 'No hay datos disponibles para este período',
  barAccent = 'primary',
}: DistributionListProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/40">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-4"
              >
                <div className="min-w-0 flex-1">{row.label}</div>

                <div className="flex flex-col gap-1 sm:w-48 sm:items-end sm:gap-0.5">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.profit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.transactionCount}{' '}
                    {row.transactionCount === 1 ? 'transacción' : 'transacciones'}
                  </p>
                </div>

                <div className="flex items-center gap-3 sm:w-40">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`${barAccentClass[barAccent]} h-full rounded-full transition-all`}
                      style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }}
                      aria-hidden
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-medium text-muted-foreground">
                    {row.percentage.toFixed(1)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
