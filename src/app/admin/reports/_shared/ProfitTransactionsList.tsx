'use client';

import { ArrowRight, Calendar, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value ?? '';
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export interface ProfitTransactionRow {
  uuid: string;
  from_currency: string;
  to_currency: string;
  profit_amount: number;
  created_at: string;
}

interface ProfitTransactionsListProps {
  transactions: ProfitTransactionRow[];
  loading?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
  };
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ProfitTransactionsList({
  transactions,
  loading = false,
  pagination,
  emptyTitle = 'No hay transacciones en este período',
  emptyDescription = 'Intenta ajustar el rango de fechas para ver más resultados.',
}: ProfitTransactionsListProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/40">
        <CardTitle className="text-base font-semibold">Detalle de transacciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {loading ? (
          <LoadingState label="Cargando transacciones..." />
        ) : transactions.length === 0 ? (
          <EmptyState icon={TrendingUp} title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {transactions.map((tx) => (
                <li
                  key={tx.uuid}
                  className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:gap-4"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    #{(tx.uuid ?? '').substring(0, 8)}
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {tx.from_currency}{' '}
                    <ArrowRight className="inline h-3.5 w-3.5 text-muted-foreground" />{' '}
                    {tx.to_currency}
                  </p>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 sm:text-right">
                    +{formatCurrency(tx.profit_amount)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground sm:justify-end">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(tx.created_at)}
                  </span>
                </li>
              ))}
            </ul>

            {pagination && pagination.totalPages > 1 ? (
              <div className="flex flex-col items-center gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages} · {pagination.total} transacciones
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => pagination.onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || pagination.disabled}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => pagination.onPageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages || pagination.disabled}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
