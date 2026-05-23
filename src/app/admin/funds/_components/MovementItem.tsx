'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { FundMovement } from '@/types/fund';
import { MOVEMENT_META } from './movementMeta';

function formatUSDT(value: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

interface MovementItemProps {
  movement: FundMovement;
  isRoot: boolean;
  getUserDisplayName: (uuid: string) => string;
  onDelete: (movement: FundMovement) => void;
}

export function MovementItem({
  movement,
  isRoot,
  getUserDisplayName,
  onDelete,
}: MovementItemProps) {
  const meta = MOVEMENT_META[movement.movement_type];
  const userName =
    movement.user?.full_name || movement.user?.username || getUserDisplayName(movement.user_uuid);

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={meta.tone} icon={meta.icon}>
                {meta.label}
              </StatusBadge>
              <span className="truncate text-sm font-medium text-foreground">{userName}</span>
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(movement.movement_date)}</p>
          </div>
          {isRoot ? (
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => onDelete(movement)}
              aria-label="Eliminar movimiento"
              className="min-h-11 min-w-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </header>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Monto
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {formatUSDT(movement.amount)} {movement.currency}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Equivalente USDT
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {formatUSDT(movement.amount_usdt)} USDT
            </p>
          </div>
        </div>

        {movement.notes ? (
          <p className="text-sm text-muted-foreground">{movement.notes}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
