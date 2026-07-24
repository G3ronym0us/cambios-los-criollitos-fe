'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Link2Off, Plus, Search, Globe, Users, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { operationService } from '@/services/operationService';
import { paymentService } from '@/services/paymentService';
import { fundService } from '@/services/fundService';
import { formatNumber } from '@/utils/functions';
import { getStatusMeta } from '@/utils/operationStatus';
import type { OperationData, OrphanAction, UnlinkPreview } from '@/types/operation';
import type { FundGroup } from '@/types/fund';
import type { PaymentData, PaymentTable } from '@/types/payment';
import { CreateOperationForm } from './CreateOperationForm';
import { OutgoingCoveragePanel } from './OutgoingCoveragePanel';
import { UnlinkOrphanDialog } from './UnlinkOrphanDialog';

interface LinkOperationPanelProps {
  payment: PaymentData;
  table: PaymentTable;
  onSuccess: () => void;
  onCancel: () => void;
  cancelLabel?: string;
  /**
   * Modo selector: en vez de vincular el pago, devuelve la operación elegida. Lo usa el
   * reparto, que necesita el mismo buscador pero no toca el vínculo.
   */
  onPick?: (operation: OperationData) => void;
  pickLabel?: string;
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
type StatusView = 'active' | 'completed';

export function LinkOperationPanel({
  payment,
  table,
  onSuccess,
  onCancel,
  cancelLabel = 'Cancelar',
  onPick,
  pickLabel = 'Elegir',
}: LinkOperationPanelProps) {
  const [operations, setOperations] = useState<OperationData[]>([]);
  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<Scope>('auto');
  const [statusView, setStatusView] = useState<StatusView>('active');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'pick' | 'create' | 'coverage'>('pick');
  // Cuánto del valor de la operación cubre este saliente (null = lo que da la tasa).
  const [settledAmount, setSettledAmount] = useState<number | null>(null);
  // Desvincular el último comprobante de una op abre el cuadro de decisión.
  const [orphan, setOrphan] = useState<UnlinkPreview | null>(null);

  useEffect(() => {
    setSelected(payment.operation_uuid);
    setSearch('');
    setScope('auto');
    setStatusView('active');
    let active = true;
    setLoading(true);
    Promise.all([
      operationService.getOperations({ limit: 500 }),
      table === 'outgoing'
        ? operationService.getOperations({ status: 'COMPLETED', limit: 500 })
        : Promise.resolve(null),
      fundService.getGroups(),
    ]).then(
      ([opsRes, completedRes, groupsRes]) => {
        if (!active) return;
        const loaded = new Map<string, OperationData>();
        if (opsRes.success && opsRes.data) {
          for (const op of opsRes.data.operations || []) loaded.set(op.uuid, op);
        }
        if (completedRes?.success && completedRes.data) {
          for (const op of completedRes.data.operations || []) loaded.set(op.uuid, op);
        }
        if (loaded.size > 0) setOperations(Array.from(loaded.values()));
        else toast.error(opsRes.error || completedRes?.error || 'No se pudieron cargar las operaciones');
        if (groupsRes.success && groupsRes.data) setGroups(groupsRes.data);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [payment, table]);

  const isGroup = (payment.client_phone || '').endsWith('@g.us');
  const matchedGroup = useMemo(
    () => (isGroup ? groups.find((g) => g.whatsapp_group_jid === payment.client_phone) : undefined),
    [isGroup, groups, payment.client_phone],
  );

  // Operaciones según el alcance: por defecto las del cliente (o las del grupo si el pago es
  // a un grupo); con "Ver todas" se muestran todas. La operación ya vinculada siempre se incluye.
  const scoped = useMemo(() => {
    // Del lado saliente una operación admite varios comprobantes (cada uno cubre una parte
    // del valor): se ocultan solo las que ya están cubiertas del todo. Del lado entrante sigue
    // valiendo uno por operación — para financiarla con otro pago está el reparto.
    const notTaken = (op: OperationData) => {
      if (op.uuid === payment.operation_uuid) return true;
      if (table === 'incoming') return !op.has_incoming_payment;
      if (op.pending_amount != null) return op.pending_amount > 0.01;
      return !op.has_outgoing_payment;
    };

    if (scope === 'global') return operations.filter(notTaken);

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
    return list.filter(notTaken);
  }, [payment, operations, scope, isGroup, matchedGroup, table]);

  const availableByStatus = useMemo(() => {
    if (table !== 'outgoing') return scoped;
    return scoped.filter((op) => {
      if (op.uuid === payment.operation_uuid) return true;
      return statusView === 'completed'
        ? op.status === 'COMPLETED'
        : op.status === 'QUOTED' || op.status === 'PENDING';
    });
  }, [payment.operation_uuid, scoped, statusView, table]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? availableByStatus
      : availableByStatus.filter((op) => {
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
  }, [availableByStatus, search]);

  const scopeLabel = (() => {
    if (scope === 'global') return 'Todas las operaciones';
    if (isGroup) {
      return matchedGroup
        ? `Cotizaciones del grupo ${matchedGroup.name}`
        : 'Grupo no reconocido — usa "Ver todas"';
    }
    const who = payment.client_name || stripPhone(payment.client_phone ?? null) || 'cliente';
    return `Cotizaciones de ${who}`;
  })();

  const selectedOp = useMemo(
    () => operations.find((op) => op.uuid === selected) ?? null,
    [operations, selected],
  );

  const doLink = async (
    operationUuid: string | null,
    orphanDecision?: { action: OrphanAction; note: string | null },
  ) => {
    // Antes de soltar el vínculo: si este es el único comprobante de la op, el operador
    // decide si la op se borra con su transacción o se queda registrada sin pago.
    if (operationUuid === null && !orphanDecision) {
      setSubmitting(true);
      const preview = await paymentService.unlinkPreview(table, payment.id);
      setSubmitting(false);
      if (preview.success && preview.data?.would_orphan) {
        setOrphan(preview.data);
        return;
      }
    }
    setSubmitting(true);
    const res = await paymentService.linkOperation(
      table,
      payment.id,
      operationUuid,
      orphanDecision ? { action: orphanDecision.action, note: orphanDecision.note } : undefined,
      operationUuid && table === 'outgoing' ? settledAmount : null,
    );
    setSubmitting(false);
    if (res.success) {
      if (orphanDecision?.action === 'DELETE_OPERATION') {
        toast.success('Pago desvinculado y operación borrada con su transacción');
      } else if (orphanDecision?.action === 'KEEP') {
        toast.success('Pago desvinculado — la operación queda registrada sin pago asociado');
      } else {
        toast.success(operationUuid ? 'Pago vinculado a la operación' : 'Pago desvinculado');
      }
      setOrphan(null);
      onSuccess();
    } else {
      toast.error(res.error || 'No se pudo actualizar el vínculo');
    }
  };

  if (mode === 'create') {
    return (
      <CreateOperationForm
        payment={payment}
        table={table}
        onSuccess={onSuccess}
        onBack={() => setMode('pick')}
      />
    );
  }

  if (mode === 'coverage' && selectedOp) {
    const client = selectedOp.client_display_name || stripPhone(selectedOp.client_phone) || 'Cliente';
    return (
      <>
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-foreground">{client}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{selectedOp.pair_symbol}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cotizado {formatNumber(selectedOp.from_amount)} {selectedOp.from_currency} →{' '}
            {formatNumber(selectedOp.to_amount)} {selectedOp.to_currency}
          </p>
        </div>

        <OutgoingCoveragePanel
          paymentId={payment.id}
          operationUuid={selectedOp.uuid}
          onChange={setSettledAmount}
        />

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => setMode('pick')} disabled={submitting}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Button onClick={() => doLink(selectedOp.uuid)} disabled={submitting}>
            {submitting ? 'Guardando…' : 'Vincular'}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cliente, teléfono, par, monto o ID"
            className="h-10 pl-9"
            autoFocus
          />
        </div>
        <Button variant="outline" className="h-10 shrink-0" onClick={() => setMode('create')}>
          <Plus className="h-4 w-4" />
          Crear
        </Button>
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

      {table === 'outgoing' ? (
        <div className="space-y-1.5">
          <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Estado de las operaciones disponibles">
            <Button
              type="button"
              variant={statusView === 'active' ? 'secondary' : 'ghost'}
              className="h-11 flex-1"
              onClick={() => setStatusView('active')}
            >
              Activas
            </Button>
            <Button
              type="button"
              variant={statusView === 'completed' ? 'secondary' : 'ghost'}
              className="h-11 flex-1"
              onClick={() => setStatusView('completed')}
            >
              Completadas
            </Button>
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            {statusView === 'completed'
              ? 'Solo se muestran las completadas que todavía no tienen pago saliente.'
              : 'Operaciones cotizadas o pendientes disponibles para completar.'}
          </p>
        </div>
      ) : null}

      <div className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 py-1">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando operaciones…</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {table === 'outgoing' && statusView === 'completed'
              ? 'No hay operaciones completadas con saldo por cubrir en este alcance.'
              : scope === 'global'
              ? 'Sin operaciones que coincidan.'
              : 'Sin cotizaciones en este alcance. Prueba "Ver todas".'}
          </p>
        ) : (
          filtered.map((op) => {
            const isSel = selected === op.uuid;
            const client = op.client_display_name || stripPhone(op.client_phone) || 'Cliente';
            const statusMeta = getStatusMeta(op.status);
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
                  <span className="flex shrink-0 items-center gap-1.5">
                    {(op.delivered_amount ?? 0) > 0.01 && (op.pending_amount ?? 0) > 0.01 ? (
                      <StatusBadge tone="warning">
                        faltan {formatNumber(op.pending_amount ?? 0)} {op.currency ?? op.from_currency}
                      </StatusBadge>
                    ) : null}
                    <StatusBadge tone={statusMeta.tone} icon={statusMeta.icon}>{statusMeta.label}</StatusBadge>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {onPick ? (
          <span />
        ) : (
          <Button
            variant="ghost"
            onClick={() => doLink(null)}
            disabled={submitting || !payment.operation_uuid}
          >
            <Link2Off className="h-4 w-4" />
            Desvincular
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            {cancelLabel}
          </Button>
          {onPick ? (
            <Button
              onClick={() => {
                const op = operations.find((o) => o.uuid === selected);
                if (op) onPick(op);
              }}
              disabled={!selected}
            >
              {pickLabel}
            </Button>
          ) : table === 'outgoing' ? (
            <Button onClick={() => setMode('coverage')} disabled={submitting || !selected}>
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => doLink(selected)} disabled={submitting || !selected}>
              {submitting ? 'Guardando…' : 'Vincular'}
            </Button>
          )}
        </div>
      </DialogFooter>

      <UnlinkOrphanDialog
        preview={orphan}
        submitting={submitting}
        onCancel={() => setOrphan(null)}
        onDecide={(action, note) => doLink(null, { action, note })}
      />
    </>
  );
}
