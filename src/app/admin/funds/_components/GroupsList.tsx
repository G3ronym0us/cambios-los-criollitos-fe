'use client';

import Link from 'next/link';
import { ArrowRight, Search, Settings2, UserPlus, Wallet } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { FundGroup, GroupBalance } from '@/types/fund';
import { avatarClass, formatUSDT, initialOf } from '../_lib/format';

type StatusFilter = 'all' | 'active' | 'inactive';

function formatCreated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

interface GroupsListProps {
  groups: FundGroup[];
  balances: Record<string, GroupBalance>;
  loadingBalances: boolean;
  isModeratorOrAbove: boolean;
  search: string;
  statusFilter: StatusFilter;
  onSearch: (value: string) => void;
  onStatusFilter: (value: StatusFilter) => void;
  onAddMember: (group: FundGroup) => void;
  onEditGroup: (group: FundGroup) => void;
}

export function GroupsList({
  groups,
  balances,
  loadingBalances,
  isModeratorOrAbove,
  search,
  statusFilter,
  onSearch,
  onStatusFilter,
  onAddMember,
  onEditGroup,
}: GroupsListProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar grupo por nombre…"
            className="h-10 pl-9"
            aria-label="Buscar grupo por nombre"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-10 w-full sm:w-48" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:px-6">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Grupos de fondos</span>
          <span className="text-xs text-muted-foreground">({groups.length})</span>
        </div>

        {groups.length === 0 ? (
          <CardContent className="p-4 sm:p-6">
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="Ningún grupo coincide con la búsqueda o el filtro seleccionado."
            />
          </CardContent>
        ) : (
          <ul className="divide-y divide-border">
            {groups.map((group) => {
              const balance = balances[group.uuid];
              const membersCount = group.members?.length ?? 0;
              return (
                <li
                  key={group.uuid}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      aria-hidden
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                        avatarClass(group.uuid),
                      )}
                    >
                      {initialOf(group.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {group.name}
                        </span>
                        <StatusBadge tone={group.is_active ? 'success' : 'neutral'}>
                          {group.is_active ? 'Activo' : 'Inactivo'}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {membersCount} {membersCount === 1 ? 'miembro' : 'miembros'}
                        {group.currency ? ` · moneda ${group.currency}` : ''}
                        {group.created_at ? ` · creado ${formatCreated(group.created_at)}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                    <div className="text-left sm:min-w-[130px] sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Posición
                      </p>
                      {loadingBalances && !balance ? (
                        <div className="mt-1 h-5 w-24 animate-pulse rounded bg-muted sm:ml-auto" />
                      ) : (
                        <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                          {balance ? `${formatUSDT(balance.total_position_usdt)} USDT` : '—'}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {isModeratorOrAbove ? (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            title="Agregar miembro"
                            aria-label={`Agregar miembro a ${group.name}`}
                            onClick={() => onAddMember(group)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            title="Editar grupo"
                            aria-label={`Editar ${group.name}`}
                            onClick={() => onEditGroup(group)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                      <Link
                        href={`/admin/funds/${group.uuid}`}
                        className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
                      >
                        Ver detalle
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
