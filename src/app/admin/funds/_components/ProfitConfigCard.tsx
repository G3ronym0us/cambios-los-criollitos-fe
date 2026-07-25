'use client';

import { AlertTriangle, Percent, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FundGroup, FundGroupMemberFlat } from '@/types/fund';

interface ProfitConfigCardProps {
  group: FundGroup;
  members: FundGroupMemberFlat[];
  canEdit: boolean;
  onEditGroup: () => void;
}

/**
 * Qué se queda el fondo de lo que se le cobra al cliente, y cómo se lo reparten sus socios.
 * Es lo que decide la ganancia de cada operación que pase por este fondo, así que avisa
 * cuando el reparto no suma 100: ahí una parte se quedaría sin dueño.
 */
export function ProfitConfigCard({ group, members, canEdit, onEditGroup }: ProfitConfigCardProps) {
  const withShare = members.filter((m) => (m.profit_share_percentage ?? 0) > 0);
  const totalShare = withShare.reduce((sum, m) => sum + (m.profit_share_percentage ?? 0), 0);
  const fundPercentage = group.default_profit_percentage;
  const sharesAreOff = withShare.length > 0 && Math.abs(totalShare - 100) > 0.01;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border bg-muted/40">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Percent className="h-5 w-5" />
          Ganancia del fondo
        </CardTitle>
        {canEdit ? (
          <Button variant="outline" size="sm" onClick={onEditGroup}>
            <Settings2 className="h-4 w-4" />
            Configurar
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {fundPercentage != null ? (
            <>
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {fundPercentage}%
              </span>
              <span className="text-sm text-muted-foreground">
                de lo que se le cobra al cliente en cada operación
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              Sin porcentaje configurado: el fondo se queda con{' '}
              <span className="font-medium text-foreground">todo</span> el margen cobrado.
            </span>
          )}
        </div>

        {withShare.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reparto entre socios
            </p>
            <ul className="flex flex-wrap gap-2">
              {withShare.map((member) => {
                const share = member.profit_share_percentage ?? 0;
                const effective =
                  fundPercentage != null ? (fundPercentage * share) / 100 : null;
                return (
                  <li
                    key={member.uuid}
                    className="flex items-baseline gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {member.username ?? member.user_uuid.slice(0, 8)}
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">{share}%</span>
                    {effective != null ? (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        ({effective.toFixed(2).replace(/\.00$/, '')}% de la operación)
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ningún socio tiene parte asignada, así que la ganancia queda en la transacción sin
            repartir. Edita cada miembro para darle la suya.
          </p>
        )}

        {sharesAreOff ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Las partes suman <span className="font-semibold tabular-nums">{totalShare}%</span>,
              no 100%.{' '}
              {totalShare < 100
                ? 'Lo que falta se queda en la transacción sin dueño.'
                : 'Se repartiría más de lo que gana el fondo.'}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
