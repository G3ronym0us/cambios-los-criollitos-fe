'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Link2Off,
  Plus,
  Search,
  Globe,
  Sparkles,
  Users,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { operationService } from '@/services/operationService';
import { paymentService } from '@/services/paymentService';
import { fundService } from '@/services/fundService';
import { formatCaracasShortDateTime, formatNumber, formatRelativeTime } from '@/utils/functions';
import { getStatusMeta } from '@/utils/operationStatus';
import type {
  OperationData,
  OperationMatchResponse,
  OperationMatchScore,
  OrphanAction,
  UnlinkPreview,
} from '@/types/operation';
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
type SortMode = 'suggested' | 'amount' | 'time';

/** Operación candidata junto a la puntuación que le dio el backend (si la tiene). */
type ScoredOperation = { op: OperationData; score: OperationMatchScore | null };

/** Cuánto se aparta el monto de la operación del comprobante: "±0", "-7", "+43". */
function formatDelta(delta: number) {
  if (Math.abs(delta) < 0.005) return '±0';
  return `${delta > 0 ? '+' : '-'}${formatNumber(Math.abs(delta))}`;
}

const byCreatedAtDesc = (a: ScoredOperation, b: ScoredOperation) =>
  (b.op.created_at ?? '').localeCompare(a.op.created_at ?? '');

/**
 * Por qué el matcher propone ESTA operación, en las palabras del propio puntaje.
 *
 * Sin esto la sugerencia es un sello sin argumento: el operador ve "SUGERIDA" y tiene que
 * decidir a ciegas si confiar. Se arma solo con lo que el backend ya devuelve —cliente,
 * monto y cercanía en el tiempo— para que no prometa más de lo que se comprobó.
 */
function describeMatchReason(
  op: OperationData,
  score: OperationMatchScore,
  payment: PaymentData,
): string {
  const señales: string[] = [];
  if (samePhone(op.client_phone, payment.client_phone)) señales.push('cliente');
  if (score.delta != null && Math.abs(score.delta) < 0.005) señales.push('monto');
  else if (score.within_tolerance) señales.push('monto aproximado');
  if (score.time_score >= 0.5) señales.push('hora');

  const cuando = formatRelativeTime(op.created_at);
  if (señales.length === 0) {
    return cuando ? `La candidata más cercana · cotizada ${cuando}` : 'La candidata más cercana';
  }
  const lista =
    señales.length === 1
      ? señales[0]
      : `${señales.slice(0, -1).join(', ')} y ${señales[señales.length - 1]}`;
  return `Coincide ${lista}${cuando ? ` (${cuando})` : ''}`;
}

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
  // Puntuación de las candidatas frente a este comprobante: la calcula el backend, con la
  // misma regla que usa el matcher automático del bot.
  const [match, setMatch] = useState<OperationMatchResponse | null>(null);
  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<Scope>('auto');
  const [statusView, setStatusView] = useState<StatusView>('active');
  const [sortMode, setSortMode] = useState<SortMode>('suggested');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'pick' | 'create' | 'coverage'>('pick');
  // Cuánto del valor de la operación cubre este saliente (null = lo que da la tasa).
  const [settledAmount, setSettledAmount] = useState<number | null>(null);
  // Desvincular el último comprobante de una op abre el cuadro de decisión.
  const [orphan, setOrphan] = useState<UnlinkPreview | null>(null);
  // Pago cuya sugerencia ya se preseleccionó: se hace una sola vez, para no mover después la
  // selección del operador al cambiar de pestaña o de alcance.
  const autoPickedFor = useRef<number | null>(null);

  useEffect(() => {
    setSelected(payment.operation_uuid);
    setSearch('');
    setScope('auto');
    setStatusView('active');
    setSortMode('suggested');
    autoPickedFor.current = null;
    let active = true;
    setLoading(true);
    setMatch(null);
    // La puntuación viaja en paralelo con el listado: si falla, el selector sigue usable
    // (sin sugerencia y ordenado por recencia, como antes de existir el scoring).
    operationService.matchForPayment(payment.id, table).then((res) => {
      if (active && res.success && res.data) setMatch(res.data);
    });
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

  // ¿Se puede comparar? Sin monto en el comprobante no hay sugerencia ni orden por cercanía.
  const scorable = payment.amount != null && payment.amount > 0;

  const scores = useMemo(
    () => new Map((match?.candidates ?? []).map((c) => [c.uuid, c])),
    [match],
  );

  const scored = useMemo<ScoredOperation[]>(
    () => availableByStatus.map((op) => ({ op, score: scores.get(op.uuid) ?? null })),
    [availableByStatus, scores],
  );

  // La sugerencia la decide el backend sobre TODAS las operaciones recientes; aquí solo se
  // respeta si además está a la vista (pestaña y alcance actuales).
  const suggestion = useMemo(() => {
    if (!match?.suggestion) return null;
    return availableByStatus.some((op) => op.uuid === match.suggestion!.uuid)
      ? match.suggestion
      : null;
  }, [match, availableByStatus]);

  // Si la sugerencia es inequívoca, queda preseleccionada — el operador todavía tiene que
  // confirmar con Continuar/Vincular, así que nunca se vincula nada solo.
  useEffect(() => {
    if (payment.operation_uuid) return;
    if (autoPickedFor.current === payment.id) return;
    if (!suggestion?.confident) return;
    autoPickedFor.current = payment.id;
    setSelected(suggestion.uuid);
  }, [payment.id, payment.operation_uuid, suggestion]);

  const ranked = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? [...scored]
      : scored.filter(({ op }) => {
          const amounts = `${op.from_amount} ${op.to_amount}`;
          return (
            (op.client_display_name || '').toLowerCase().includes(q) ||
            (op.client_phone || '').toLowerCase().includes(q) ||
            (op.pair_symbol || '').toLowerCase().includes(q) ||
            op.uuid.toLowerCase().includes(q) ||
            amounts.includes(q)
          );
        });

    if (sortMode === 'time') {
      list.sort(byCreatedAtDesc);
    } else if (sortMode === 'amount') {
      // Por cercanía al monto del comprobante; las que no se pueden comparar, al final.
      list.sort((a, b) => {
        const ra = a.score?.relative ?? Number.POSITIVE_INFINITY;
        const rb = b.score?.relative ?? Number.POSITIVE_INFINITY;
        return ra !== rb ? ra - rb : byCreatedAtDesc(a, b);
      });
    } else {
      // Sin puntuación (o si el backend falló) todas valen 0 y manda la recencia: el orden
      // de siempre, que es exactamente el comportamiento previo al scoring.
      list.sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0) || byCreatedAtDesc(a, b));
      const i = suggestion ? list.findIndex((s) => s.op.uuid === suggestion.uuid) : -1;
      if (i > 0) list.unshift(...list.splice(i, 1));
    }
    // El corte va DESPUÉS de ordenar: al revés la sugerida podía quedar fuera de la lista.
    return list.slice(0, 60);
  }, [scored, search, sortMode, suggestion]);

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
      {/* Contra qué se está eligiendo. Va arriba del todo y siempre: es el dato que el
          operador compara con cada candidata, y antes solo aparecía si había puntuación. */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">Comprobante</span>
        <span className="truncate text-xs font-semibold tabular-nums text-foreground">
          {formatNumber(payment.amount ?? 0)} {payment.currency ?? ''}
          {payment.provider ? ` · ${payment.provider}` : ''} ·{' '}
          {formatCaracasShortDateTime(payment.created_at)}
        </span>
      </div>

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

      {scorable ? (
        <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Orden de las operaciones">
          {(
            [
              ['suggested', 'Sugerida'],
              ['amount', 'Monto'],
              ['time', 'Hora'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={sortMode === value ? 'secondary' : 'ghost'}
              className="h-11 flex-1"
              onClick={() => setSortMode(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}

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
        ) : ranked.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {table === 'outgoing' && statusView === 'completed'
              ? 'No hay operaciones completadas con saldo por cubrir en este alcance.'
              : scope === 'global'
              ? 'Sin operaciones que coincidan.'
              : 'Sin cotizaciones en este alcance. Prueba "Ver todas".'}
          </p>
        ) : (
          ranked.map(({ op, score }) => {
            const isSel = selected === op.uuid;
            const isSuggested = suggestion?.uuid === op.uuid;
            const client = op.client_display_name || stripPhone(op.client_phone) || 'Cliente';
            const statusMeta = getStatusMeta(op.status);
            return (
              <button
                key={op.uuid}
                type="button"
                onClick={() => setSelected(op.uuid)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                  isSel
                    ? 'border-primary bg-card ring-3 ring-primary/10'
                    : 'border-border hover:bg-muted/50',
                  isSuggested && !isSel && 'ring-1 ring-primary/30',
                )}
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
                    {isSuggested ? (
                      <StatusBadge tone="primary" icon={Sparkles}>Sugerida</StatusBadge>
                    ) : null}
                    {(op.delivered_amount ?? 0) > 0.01 && (op.pending_amount ?? 0) > 0.01 ? (
                      <StatusBadge tone="warning">
                        faltan {formatNumber(op.pending_amount ?? 0)} {op.currency ?? op.from_currency}
                      </StatusBadge>
                    ) : null}
                    <StatusBadge tone={statusMeta.tone} icon={statusMeta.icon}>{statusMeta.label}</StatusBadge>
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {formatCaracasShortDateTime(op.created_at)} · {formatRelativeTime(op.created_at)}
                    </span>
                  </span>
                  {score?.delta != null ? (
                    <span
                      className={`shrink-0 tabular-nums ${
                        score.within_tolerance
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatDelta(score.delta)}
                    </span>
                  ) : null}
                </div>
                {/* El argumento de la sugerencia, no solo el sello. */}
                {isSuggested && score ? (
                  <p className="mt-1.5 border-t border-dashed border-border pt-1.5 text-xs text-muted-foreground">
                    {describeMatchReason(op, score, payment)}
                  </p>
                ) : null}
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
              {submitting
                ? 'Guardando…'
                : // El monto en el botón: lo que se confirma, no un verbo suelto.
                  selected && payment.amount != null
                  ? `Vincular ${formatNumber(payment.amount)} ${payment.currency ?? ''}`.trim()
                  : 'Vincular'}
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
