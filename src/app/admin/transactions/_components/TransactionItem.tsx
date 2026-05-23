'use client';

import Link from 'next/link';
import { ArrowRight, Edit, Eye, MoreHorizontal, Trash2, TrendingUp } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TransactionData } from '@/types/transaction';
import { TransactionStatusBadge } from './TransactionStatusBadge';

interface TransactionItemProps {
  transaction: TransactionData;
  onDelete: (transaction: TransactionData) => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function TransactionItem({ transaction, onDelete }: TransactionItemProps) {
  const detailHref = `/admin/transactions/${transaction.uuid}`;
  const editHref = `/admin/transactions/${transaction.uuid}/edit`;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {transaction.from_currency}{' '}
                <ArrowRight className="inline h-4 w-4 text-muted-foreground" />{' '}
                {transaction.to_currency}
              </h3>
              <TransactionStatusBadge status={transaction.status} />
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  aria-label="Acciones de la transacción"
                  className="min-h-11 min-w-11"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuItem render={<Link href={detailHref} />}>
                <Eye className="mr-2 h-4 w-4" /> Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={editHref} />}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(transaction)}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Monto
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatCurrency(transaction.from_amount)} {transaction.from_currency}
              {transaction.to_amount != null ? (
                <span className="text-muted-foreground">
                  {' '}
                  <ArrowRight className="inline h-3 w-3" /> {formatCurrency(transaction.to_amount)}{' '}
                  {transaction.to_currency}
                </span>
              ) : null}
            </p>
            {transaction.exchange_rate != null ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tasa: {formatCurrency(transaction.exchange_rate)}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Ganancia
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatCurrency(transaction.profit_amount)} ({transaction.total_profit_percentage}%)
            </p>
            {transaction.profit_amount_usdt != null ? (
              <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                ≈ {formatCurrency(transaction.profit_amount_usdt)} USDT
              </p>
            ) : null}
          </div>
        </div>

        {transaction.description ? (
          <p className="text-sm text-muted-foreground">{transaction.description}</p>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <Link
            href={detailHref}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Eye className="h-4 w-4" />
            Ver
          </Link>
          <Link
            href={editHref}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
