'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link2Off, Search, Globe, Users, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { operationService } from '@/services/operationService';
import { paymentService } from '@/services/paymentService';
import { fundService } from '@/services/fundService';
import { formatNumber } from '@/utils/functions';
import type { OperationData } from '@/types/operation';
import type { FundGroup } from '@/types/fund';
import type { PaymentData, PaymentTable } from '@/types/payment';

interface LinkOperationDialogProps {
  payment: PaymentData | null;
  table: PaymentTable;
  onClose: () => void;
  onLinked: () => void;
}

function stripPhone(phone: string | null) {
  return (phone || '').replace(/@(c|g)\.us$/, '');
}

function samePhone(a: string | null, b: string | null) {
  const na = stripPhone(a).replace(/\D/g, '');
  const nb = stripPhone(b).replace(/\D/g, '');
  return na !== '' && na === nb;
}

type Scope = 'auto' | 'global';

export function LinkOperationDialog({ payment, table, onClose, onLinked }: LinkOperationDialogProps) {
  const [operations, setOperations] = useState<OperationData[]>([]);
  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<Scope>('auto');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setSelected(payment.operation_uuid);
    setSearch('');
    setScope('auto');
    let active = true;
    setLoading(true);
    Promise.all([operationService.getOperations({ limit: 500 }), fundService.getGroups()]).then(
      ([opsRes, groupsRes]) => {
        if (!active) return;
        if (opsRes.success && opsRes.data) setOperations(opsRes.data.operations || []);
        else toast.error(opsRes.error || 'No se pudieron cargar las operaciones');
        if (groupsRes.success && groupsRes.data) setGroups(groupsRes.data);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [payment]);

  const isGroup = (payment?.client_phone || '').endsWith('@g.us');
  const matchedGroup = useMemo(
    () => (isGroup ? groups.find((g) => g.whatsapp_group_jid === payment?.client_phone) : undefined),
    [isGroup, groups, payment?.client_phone],
  );

  // Operaciones según el alcance: por defecto las del cliente (o las del grupo si el pago es
  // a un grupo); con "Ver todas" se muestran todas. La operación ya vinculada siempre se incluye.
  const scoped = useMemo(() => {
    if (!payment) return [];
    if (scope === 'global') return operations;

    let list: OperationData[];
    if (isGroup) {
      if (matchedGroup) {
        // Ops del grupo: las etiquetadas con el fund_group, o las de sus miembros
        // (recibidas por un miembro, o cuyo cliente es el número de un miembro/socio).
        const memberUserUuids = new Set((matchedGroup.members ?? []).map((m) => m.user_uuid));
        const memberPhones = new Set(
          (matchedGroup.members ?? [])
            .map((m) => stripPhone(m.whatsapp_phone ?? null).replace(/\D/g, ''))
            .filter(Boolean),
        );
        list = operations.filter(
          (op) =>
            op.fund_group_uuid === matchedGroup.uuid ||
            (op.received_by_user_uuid && memberUserUuids.has(op.received_by_user_uuid)) ||
            (op.client_phone && memberPhones.has(stripPhone(op.client_phone).replace(/\D/g, ''))),
        );
      } else {
        list = [];
      }
    } else {
      list = operations.filter(
        (op) =>
          (payment.client_uuid && op.client_uuid === payment.client_uuid) ||
          samePhone(op.client_phone, payment.client_phone),
      );
    }

    if (payment.operation_uuid && !list.some((op) => op.uuid === payment.operation_uuid)) {
      const linked = operations.find((op) => op.uuid === payment.operation_uuid);
      if (linked) list = [linked, ...list];
    }
    return list;
  }, [payment, operations, scope, isGroup, matchedGroup]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? scoped
      : scoped.filter((op) => {
          const amounts = `${op.from_amount} ${op.to_amount}`;
          return (
            (op.client_display_name || '').toLowerCase().includes(q) ||
            (op.client_phone || '').toLowerCase().includes(q) ||
            (op.pair_symbol || '').toLowerCase().includes(q) ||
            op.uuid.toLowerCase().includes(q) ||
            amounts.includes(q)
          );
        });
    return list.slice(0, 60);
  }, [scoped, search]);

  const scopeLabel = (() => {
    if (scope === 'global') return 'Todas las operaciones';
    if (isGroup) {
      return matchedGroup
        ? `Cotizaciones del grupo ${matchedGroup.name}`
        : 'Grupo no reconocido — usa "Ver todas"';
    }
    const who = payment?.client_name || stripPhone(payment?.client_phone ?? null) || 'cliente';
    return `Cotizaciones de ${who}`;
  })();

  const doLink = async (operationUuid: string | null) => {
    if (!payment) return;
    setSubmitting(true);
    const res = await paymentService.linkOperation(table, payment.id, operationUuid);
    setSubmitting(false);
    if (res.success) {
      toast.success(operationUuid ? 'Pago vinculado a la operación' : 'Pago desvinculado');
      onLinked();
      onClose();
    } else {
      toast.error(res.error || 'No se pudo actualizar el vínculo');
    }
  };

  return (
    <Dialog open={payment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular a operación</DialogTitle>
          <DialogDescription>
            Elige la cotización a la que pertenece este pago. Busca por cliente, par, monto o ID.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cliente, teléfono, par, monto o ID"
            className="h-10 pl-9"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {scope === 'global' ? (
              <Globe className="h-3.5 w-3.5 shrink-0" />
            ) : isGroup ? (
              <Users className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <UserRound className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{scopeLabel}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setScope((s) => (s === 'global' ? 'auto' : 'global'))}
          >
            {scope === 'global' ? (
              <>
                <UserRound className="h-4 w-4" />
                {isGroup ? 'Solo del grupo' : 'Solo del cliente'}
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Ver todas
              </>
            )}
          </Button>
        </div>

        <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 py-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando operaciones…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {scope === 'global'
                ? 'Sin operaciones que coincidan.'
                : 'Sin cotizaciones en este alcance. Prueba "Ver todas".'}
            </p>
          ) : (
            filtered.map((op) => {
              const isSel = selected === op.uuid;
              const client = op.client_display_name || stripPhone(op.client_phone) || 'Cliente';
              return (
                <button
                  key={op.uuid}
                  type="button"
                  onClick={() => setSelected(op.uuid)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    isSel ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{client}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{op.pair_symbol}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {formatNumber(op.from_amount)} {op.from_currency} → {formatNumber(op.to_amount)} {op.to_currency}
                    </span>
                    <StatusBadge tone="neutral">{op.status}</StatusBadge>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => doLink(null)}
            disabled={submitting || !payment?.operation_uuid}
          >
            <Link2Off className="h-4 w-4" />
            Desvincular
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={() => doLink(selected)} disabled={submitting || !selected}>
              {submitting ? 'Guardando…' : 'Vincular'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
