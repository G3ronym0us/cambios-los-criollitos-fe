'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Ban, Building2, ChevronRight, Coins, Eye, Users, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { isEntityClientPhone } from '@/utils/functions';
import type { ClientData } from '@/types/client';
import {
  formatPending,
  formatPendingBreakdown,
  pendingTone,
  type PendingTotals,
} from '../_lib/pending';
import type { ClientPendingByPair } from '@/types/client';

interface ClientItemProps {
  client: ClientData;
  /** Lo que le debemos, ya acotado al par filtrado. Sin deuda, no se pinta nada. */
  pending: PendingTotals;
}

function isGroup(phone: string) {
  return phone.includes('@g.us');
}

function formatPhone(phone: string) {
  if (isGroup(phone)) return 'Grupo de WhatsApp';
  return phone.replace(/@c\.us$/, '');
}

// Fecha en hora local del operador (el timestamp viene en UTC del backend).
function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * El bloque de deuda de la fila. Sólo aparece cuando hay algo que entregar: sin filtro, la
 * lista sigue siendo el directorio de siempre y las pocas filas con deuda destacan solas.
 *
 * La cifra grande es la exacta, en la moneda del valor del trato; debajo va el equivalente
 * en la moneda con la que se paga, con «≈», porque sale de la tasa cotizada y la real la
 * fijan los comprobantes.
 */
function PendingBlock({
  pending,
  entries,
}: {
  pending: PendingTotals;
  entries: ClientPendingByPair[];
}) {
  const alert = pendingTone(pending.oldest_at) === 'destructive';
  // Con más de una moneda no hay una cifra que enseñar: `pendingTotals` deja el total sin
  // moneda justo para esto, y sumarlas igual sería mezclar dólares con bolívares.
  const mixed = pending.currency == null;

  return (
    <div
      className={cn(
        'ml-auto shrink-0 rounded-lg border px-3 py-1.5 text-right',
        alert
          ? 'border-destructive/30 bg-destructive/10'
          : 'border-amber-500/30 bg-amber-500/10',
      )}
    >
      <p
        className={cn(
          'text-[10px] font-bold uppercase tracking-wider',
          alert ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
        )}
      >
        Por entregar
      </p>
      <p
        className={cn(
          'font-bold tabular-nums',
          mixed ? 'text-sm' : 'text-base',
          alert ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
        )}
      >
        {mixed ? formatPendingBreakdown(entries) : formatPending(pending.amount, pending.currency)}
      </p>
      {!mixed && pending.payout_amount != null && pending.payout_currency ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          ≈ {formatPending(pending.payout_amount, pending.payout_currency)}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground tabular-nums">
        {pending.operations} {pending.operations === 1 ? 'operación' : 'operaciones'}
      </p>
    </div>
  );
}

// Memoizado: la búsqueda filtra en memoria y re-renderiza la lista en cada tecla.
export const ClientItem = memo(function ClientItem({ client, pending }: ClientItemProps) {
  const group = isGroup(client.phone);
  const entity = isEntityClientPhone(client.phone);
  const displayName = client.display_name || (group ? 'Grupo sin nombre' : 'Sin nombre');
  const initial = (client.display_name || (group ? 'G' : '?')).charAt(0).toUpperCase();
  const lastSeen = formatDate(client.last_seen_at);

  return (
    <Link
      href={`/admin/clients/${client.uuid}`}
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`Ver cliente ${displayName}`}
    >
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <header className="flex items-start justify-between gap-3">
            {/* Envuelve en vez de apretarse: en pantallas estrechas el bloque de deuda cae
                a su propia línea y se alinea a la derecha, sin duplicar marcado. */}
            <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
              <div
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
              >
                {entity ? (
                  <Building2 className="h-5 w-5" />
                ) : group ? (
                  <Users className="h-5 w-5" />
                ) : (
                  <span className="text-base font-bold">{initial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 basis-48">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-foreground sm:text-lg">
                    {displayName}
                  </p>
                  {group ? (
                    <StatusBadge tone="neutral" icon={Users}>Grupo</StatusBadge>
                  ) : null}
                  {entity ? (
                    <StatusBadge tone="neutral" icon={Building2}>Entidad</StatusBadge>
                  ) : null}
                  {client.is_blocked ? (
                    <StatusBadge tone="destructive" icon={Ban}>Bloqueado</StatusBadge>
                  ) : null}
                  {client.is_tracked ? (
                    <StatusBadge tone="info" icon={Eye}>Seguido</StatusBadge>
                  ) : null}
                  {client.is_usdt_authorized ? (
                    <StatusBadge tone="success" icon={Coins}>USDT</StatusBadge>
                  ) : null}
                  {client.balance > 0 ? (
                    <StatusBadge tone="success" icon={Wallet}>
                      ${client.balance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a favor
                    </StatusBadge>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {entity
                    ? `Entidad${client.linked_group_jid ? ' · grupo vinculado' : ''}`
                    : formatPhone(client.phone)}
                  {client.preferred_pair_symbol ? (
                    <>
                      <span className="mx-1 text-muted-foreground/50">·</span>
                      <span>{client.preferred_pair_symbol}</span>
                    </>
                  ) : null}
                </p>
                {lastSeen ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">Visto por última vez el {lastSeen}</p>
                ) : null}
              </div>

              {pending.operations > 0 ? (
                <PendingBlock pending={pending} entries={client.pending_by_pair ?? []} />
              ) : null}
            </div>

            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </header>
        </CardContent>
      </Card>
    </Link>
  );
});
