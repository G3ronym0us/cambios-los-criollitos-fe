'use client';

import Link from 'next/link';
import { Ban, ChevronRight, Coins, Eye, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { ClientData } from '@/types/client';

interface ClientItemProps {
  client: ClientData;
}

function isGroup(phone: string) {
  return phone.includes('@g.us');
}

function formatPhone(phone: string) {
  if (isGroup(phone)) return 'Grupo de WhatsApp';
  return phone.replace(/@c\.us$/, '');
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function ClientItem({ client }: ClientItemProps) {
  const group = isGroup(client.phone);
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
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground"
              >
                {group ? <Users className="h-5 w-5" /> : <span className="text-base font-bold">{initial}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                    {displayName}
                  </h3>
                  {group ? (
                    <StatusBadge tone="neutral" icon={Users}>Grupo</StatusBadge>
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
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {formatPhone(client.phone)}
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
            </div>

            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </header>
        </CardContent>
      </Card>
    </Link>
  );
}
