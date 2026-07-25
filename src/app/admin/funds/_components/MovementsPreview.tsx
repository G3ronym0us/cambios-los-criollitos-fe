'use client';

import Link from 'next/link';
import { ArrowRight, Receipt } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { FundMovement } from '@/types/fund';
import { formatUSDT } from '../_lib/format';
import { MOVEMENT_META } from './movementMeta';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

interface MovementsPreviewProps {
  movements: FundMovement[];
  loading: boolean;
  total: number;
  historyHref: string;
  getUserDisplayName: (uuid: string, fallback?: string | null) => string;
}

/** Resumen de los últimos movimientos del grupo, con enlace al historial completo (pantalla 3). */
export function MovementsPreview({
  movements,
  loading,
  total,
  historyHref,
  getUserDisplayName,
}: MovementsPreviewProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Últimos movimientos</span>
          {total > 0 ? <span className="text-xs text-muted-foreground">({total})</span> : null}
        </div>
        <Link
          href={historyHref}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          Ver historial completo
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <ul className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </li>
          ))}
        </ul>
      ) : movements.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
          Todavía no se ha registrado ningún movimiento en este grupo.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {movements.map((mv) => {
            const meta = MOVEMENT_META[mv.movement_type];
            const userName = getUserDisplayName(mv.user_uuid, mv.username);
            return (
              <li
                key={mv.uuid}
                className="flex items-center gap-3 px-4 py-3 sm:px-6"
              >
                <StatusBadge tone={meta.tone} icon={meta.icon} className="shrink-0">
                  {meta.label}
                </StatusBadge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(mv.movement_date)}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-foreground">
                  {formatUSDT(mv.amount_usdt)} USDT
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
