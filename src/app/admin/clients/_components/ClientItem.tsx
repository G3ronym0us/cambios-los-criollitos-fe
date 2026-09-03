'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Ban, Building2, ChevronRight, Coins, Eye, Users, Wallet, Tag } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { isEntityClientPhone } from '@/utils/functions';
import type { ClientData, ClientPendingByPair } from '@/types/client';
import {
  formatPending,
  formatPendingBreakdown,
  pendingTone,
  type PendingTotals,
} from '../_lib/pending';

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

/**
 * El bloque de deuda de la fila. Sólo aparece cuando hay algo que entregar: sin filtro, la
 * lista sigue siendo el directorio de siempre y las pocas filas con deuda destacan solas.
 *
 * La cifra es la exacta, en la moneda del valor del trato. El equivalente en la moneda con
 * la que se paga se quitó: salía de la tasa cotizada y no de la
 * fijan los comprobantes.
 *
 * Dos líneas de texto, sin caja ni rótulo: la caja con borde envolvía en 390 px y dejaba el
 * directorio a dos alturas de fila distintas según quién debiera. El rótulo «Por entregar»
 * tampoco hace falta —la franja de arriba ya dice que la lista va de eso— y el color hace
 * el trabajo que hacía el texto: rojo pasados `PENDING_ALERT_DAYS`, ámbar antes.
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
    <div className="ml-auto shrink-0 text-right">
      <p
        className={cn(
          'font-bold leading-tight tabular-nums',
          mixed ? 'text-sm' : 'text-base',
          alert ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
        )}
      >
        {mixed ? formatPendingBreakdown(entries) : formatPending(pending.amount, pending.currency)}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {mixed
          ? `${pending.operations} ${pending.operations === 1 ? 'operación' : 'operaciones'}`
          : `${pending.currency} · ${pending.operations} ${pending.operations === 1 ? 'op' : 'ops'}`}
      </p>
    </div>
  );
}

/**
 * Una fila del directorio de clientes.
 *
 * Es una FILA, no una tarjeta: con 174 clientes lo que se hace aquí es barrer la lista
 * buscando a uno, y una rejilla de tarjetas mete tres veces menos gente en pantalla. Lo
 * que se lee de un vistazo es el nombre y, cuando la hay, la deuda.
 *
 * Memoizada: la búsqueda filtra en memoria y re-renderiza la lista en cada tecla.
 */
export const ClientItem = memo(function ClientItem({ client, pending }: ClientItemProps) {
  const group = isGroup(client.phone);
  const entity = isEntityClientPhone(client.phone);
  const displayName = client.display_name || (group ? 'Grupo sin nombre' : 'Sin nombre');
  const initial = (client.display_name || (group ? 'G' : '?')).charAt(0).toUpperCase();

  return (
    <Link
      href={`/admin/clients/${client.uuid}`}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 outline-none transition-colors last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
      aria-label={`Ver cliente ${displayName}`}
    >
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
      >
        {entity ? (
          <Building2 className="h-5 w-5" />
        ) : group ? (
          <Users className="h-5 w-5" />
        ) : (
          <span className="text-base font-bold">{initial}</span>
        )}
      </span>

      <span className="min-w-0 flex-1 basis-48">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-foreground sm:text-base">
            {displayName}
          </span>
          {group ? <StatusBadge tone="neutral" icon={Users}>Grupo</StatusBadge> : null}
          {entity ? <StatusBadge tone="neutral" icon={Building2}>Entidad</StatusBadge> : null}
          {client.is_blocked ? (
            <StatusBadge tone="destructive" icon={Ban}>Bloqueado</StatusBadge>
          ) : null}
          {client.is_tracked ? <StatusBadge tone="info" icon={Eye}>Seguido</StatusBadge> : null}
          {client.is_usdt_authorized ? (
            <StatusBadge tone="success" icon={Coins}>USDT</StatusBadge>
          ) : null}
          {client.is_rate_setter ? (
            <StatusBadge tone="info" icon={Tag}>Fija tasa</StatusBadge>
          ) : null}
          {client.balance > 0 ? (
            <StatusBadge tone="success" icon={Wallet}>
              $
              {client.balance.toLocaleString('es-VE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              a favor
            </StatusBadge>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {entity
            ? `Entidad${client.linked_group_jid ? ' · grupo vinculado' : ''}`
            : formatPhone(client.phone)}
          {client.preferred_pair_symbol ? <> · {client.preferred_pair_symbol}</> : null}
        </span>
      </span>

      {pending.operations > 0 ? (
        <PendingBlock pending={pending} entries={client.pending_by_pair ?? []} />
      ) : null}

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
});
