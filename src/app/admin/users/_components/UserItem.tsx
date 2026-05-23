'use client';

import { CircleDollarSign, Edit, MoreHorizontal, Shield, UserCog, UserX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { CommissionUserResponse } from '@/types/user';

interface UserItemProps {
  user: CommissionUserResponse;
  onEdit: (userUuid: string) => void;
  onDelete: (user: CommissionUserResponse) => void;
  onToggleCommission: (user: CommissionUserResponse) => void;
}

type RoleMeta = {
  label: string;
  tone: 'primary' | 'info' | 'destructive' | 'neutral';
  icon: LucideIcon;
};

function getRoleMeta(role?: string): RoleMeta {
  switch ((role || '').toUpperCase()) {
    case 'ROOT':
      return { label: 'Administrador', tone: 'destructive', icon: Shield };
    case 'MODERATOR':
      return { label: 'Moderador', tone: 'info', icon: UserCog };
    case 'USER':
      return { label: 'Usuario', tone: 'primary', icon: Shield };
    default:
      return { label: 'Sin rol', tone: 'neutral', icon: Shield };
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function UserItem({ user, onEdit, onDelete, onToggleCommission }: UserItemProps) {
  const displayName = user.full_name || user.username;
  const initial = displayName.charAt(0).toUpperCase();
  const roleMeta = getRoleMeta(user.role);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground"
            >
              <span className="text-base font-bold">{initial}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                  {displayName}
                </h3>
                <StatusBadge tone={roleMeta.tone} icon={roleMeta.icon}>
                  {roleMeta.label}
                </StatusBadge>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                @{user.username} <span className="mx-1 text-muted-foreground/50">·</span>{' '}
                <span className="truncate">{user.email}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Creado el {formatDate(user.created_at)}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  aria-label={`Acciones para ${displayName}`}
                  className="min-h-11 min-w-11"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuItem onClick={() => onEdit(user.uuid)}>
                <Edit className="mr-2 h-4 w-4" /> Editar usuario
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(user)}>
                <UserX className="mr-2 h-4 w-4" /> Desactivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <CircleDollarSign className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">Recibe comisiones</p>
              <p className="text-xs text-muted-foreground">
                {user.can_receive_commission
                  ? 'Aparece en los splits de comisiones.'
                  : 'No aparece en los splits.'}
              </p>
            </div>
          </div>
          <Switch
            checked={user.can_receive_commission}
            onCheckedChange={() => onToggleCommission(user)}
            aria-label={`Alternar comisiones para ${displayName}`}
          />
        </label>
      </CardContent>
    </Card>
  );
}
