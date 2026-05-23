'use client';

import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MemberBalance } from '@/types/fund';

function formatUSDT(value: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface MemberPositionsListProps {
  members: MemberBalance[];
}

export function MemberPositionsList({ members }: MemberPositionsListProps) {
  if (members.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/40">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-5 w-5" />
          Posición por gestor
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {members.map((member) => {
            const displayName = member.full_name || member.username;
            const initial = displayName.charAt(0).toUpperCase();
            const positive = member.position_usdt >= 0;
            return (
              <li
                key={member.user_uuid}
                className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:items-center sm:gap-4 sm:px-6 sm:py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  >
                    <span className="text-xs font-semibold">{initial}</span>
                  </div>
                  <span className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                </div>

                <div className="text-sm sm:text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground sm:hidden">
                    Depositado
                  </p>
                  <p className="font-mono text-foreground">
                    {formatUSDT(member.total_deposited_usdt)}
                  </p>
                </div>

                <div className="text-sm sm:text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground sm:hidden">
                    Salidas
                  </p>
                  <p className="font-mono text-foreground">
                    {formatUSDT(member.total_outflow_usdt)}
                  </p>
                </div>

                <div className="text-sm sm:text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground sm:hidden">
                    Posición
                  </p>
                  <p
                    className={cn(
                      'font-mono font-semibold',
                      positive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-destructive'
                    )}
                  >
                    {positive ? '+' : ''}
                    {formatUSDT(member.position_usdt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
