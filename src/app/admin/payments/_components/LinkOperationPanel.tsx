'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Link2Off,
  Plus,
  Search,
  Globe,
  Info,
  Users,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { SidePanelBody, SidePanelFooter } from '@/components/shared/SidePanel';
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
import { describeCoverage } from './paymentRowData';
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

/** Verde cuando calza, ámbar cuando deja remanente que habrá que repartir, gris si falta. */
function coverageTone(score: OperationMatchScore) {
  if (score.within_tolerance) return 'text-emerald-600 dark:text-emerald-400';
  if ((score.delta ?? 0) < 0) return 'text-amber-700 dark:text-amber-400';
  return 'text-muted-foreground';
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
  confident: boolean,
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
  // Cuando la sugerencia es inequívoca, decirlo con todas las letras: es el mismo vínculo
  // que el matcher del bot habría hecho solo, y eso es lo que autoriza a confirmar sin
  // revisar el resto de la lista. La hora no se repite: ya está en la línea de arriba.
  const respaldo = confident ? ' · el bot habría hecho este mismo vínculo' : '';
  return `Coincide ${lista}${respaldo}`;
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

  /**
   * Lo que sobraría del comprobante si se vincula la candidata elegida.
   *
   * Solo del lado entrante: ahí el sobrante se reparte o se acredita al saldo. En el
   * saliente un comprobante que no cubre del todo es lo normal y se resuelve en el paso
   * de cobertura.
   */
  const remainder = useMemo(() => {
    if (onPick || table !== 'incoming' || !selected) return 0;
    const delta = scores.get(selected)?.delta;
    return delta != null && delta < -0.01 ? -delta : 0;
  }, [onPick, table, selected, scores]);

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
        <SidePanelBody>
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
        </SidePanelBody>

        <SidePanelFooter>
          <Button variant="ghost" onClick={() => setMode('pick')} disabled={submitting}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Button onClick={() => doLink(selectedOp.uuid)} disabled={submitting}>
            {submitting ? 'Guardando…' : 'Vincular'}
          </Button>
        </SidePanelFooter>
      </>
    );
  }

  return (
    <>
      {/* Contra qué se está eligiendo vive ahora en la cabecera del cajón, visible en todos
          los pasos. Aquí abajo solo va lo que se manipula. */}
      <SidePanelBody className="gap-0 overflow-hidden py-0">
      {/* Bloque de filtros: fijo, separado de la lista por una línea. Sin esa separación los
          controles y las candidatas se leían como una sola columna de bloques del mismo peso. */}
      <div className="-mx-4 flex shrink-0 flex-col gap-2.5 border-b border-border px-4 py-3.5 sm:-mx-5 sm:px-5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cliente, teléfono, par, monto o ID"
            className="h-9 pl-8 text-[12.5px]"
            autoFocus
          />
        </div>
        <Button variant="outline" className="h-9 shrink-0" onClick={() => setMode('create')}>
          <Plus className="h-4 w-4" />
          Crear
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted-foreground">
          {scope === 'global' ? (
            <Globe className="h-3.5 w-3.5 shrink-0" />
          ) : isGroup ? (
            <Users className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <UserRound className="h-3.5 w-3.5 shrink-0" />
          )}
          {/* Cuántas hay en este alcance: sin el número, "Ver todas" no dice si amplía a
              tres candidatas o a trescientas. */}
          <span className="truncate">
            {scopeLabel}
            {availableByStatus.length > 0 ? ` · ${availableByStatus.length} disponibles` : ''}
          </span>
        </span>
        {/* Enlace, no botón: ampliar el alcance es un desvío del camino principal y no debe
            competir en peso con "Crear" ni con la lista. El padding negativo le devuelve
            área de toque sin engordarlo. */}
        <button
          type="button"
          className="-my-2 shrink-0 py-2 text-[11.5px] font-semibold text-primary transition-colors hover:underline"
          onClick={() => setScope((s) => (s === 'global' ? 'auto' : 'global'))}
        >
          {scope === 'global' ? (isGroup ? 'Solo del grupo' : 'Solo del cliente') : 'Ver todas'}
        </button>
      </div>

      {scorable ? (
        <div className="flex items-center gap-2.5">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Ordenar
        </span>
        <div
          className="flex flex-1 gap-0.5 rounded-[9px] border border-border bg-muted p-0.5"
          role="group"
          aria-label="Orden de las operaciones"
        >
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
              variant="ghost"
              className={cn(
                'h-9 flex-1 rounded-[7px] text-xs sm:h-8',
                sortMode === value
                  ? 'bg-card font-semibold text-foreground shadow-xs hover:bg-card'
                  : 'font-medium text-muted-foreground',
              )}
              onClick={() => setSortMode(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        </div>
      ) : null}

      {table === 'outgoing' ? (
        <div className="space-y-1.5">
          <div
            className="flex gap-0.5 rounded-[9px] border border-border bg-muted p-0.5"
            role="group"
            aria-label="Estado de las operaciones disponibles"
          >
            {(
              [
                ['active', 'Activas'],
                ['completed', 'Completadas'],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                className={cn(
                  'h-9 flex-1 rounded-[7px] text-xs sm:h-8',
                  statusView === value
                    ? 'bg-card font-semibold text-foreground shadow-xs hover:bg-card'
                    : 'font-medium text-muted-foreground',
                )}
                onClick={() => setStatusView(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {statusView === 'completed'
              ? 'Solo se muestran las completadas que todavía no tienen pago saliente.'
              : 'Operaciones cotizadas o pendientes disponibles para completar.'}
          </p>
        </div>
      ) : null}
      </div>

      <div
        className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 py-3"
        role="radiogroup"
        aria-label="Operaciones candidatas"
      >
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
            // El par ya nombra las dos monedas: repetirlas junto a cada importe alarga la
            // línea principal sin añadir nada.
            const pairLabel = op.pair_symbol || [op.from_currency, op.to_currency].filter(Boolean).join('/');
            const headline = pairLabel
              ? `${pairLabel} · ${formatNumber(op.from_amount)} → ${formatNumber(op.to_amount)}`
              : `${formatNumber(op.from_amount)} ${op.from_currency ?? ''} → ${formatNumber(op.to_amount)} ${op.to_currency ?? ''}`;
            const coverage =
              score?.delta != null && payment.amount != null
                ? describeCoverage(score.delta, payment.amount, payment.currency ?? '')
                : null;
            return (
              <button
                key={op.uuid}
                type="button"
                role="radio"
                aria-checked={isSel}
                onClick={() => setSelected(op.uuid)}
                className={cn(
                  'flex w-full gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors',
                  isSel ? 'border-primary ring-3 ring-primary/10' : 'border-border hover:bg-muted/50',
                  isSuggested && !isSel && 'ring-1 ring-primary/30',
                )}
              >
                {/* El punto de selección: sin él la lista se leía como navegación y no como
                    "elige una", que es lo que confirma el botón del pie. */}
                <span
                  aria-hidden
                  className={cn(
                    'mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2',
                    isSel ? 'border-[4px] border-primary' : 'border-border',
                  )}
                />
                <span className="min-w-0 flex-1">
                  {/* Filtrado por cliente el nombre se repite en cada tarjeta y no distingue
                      nada: ahí manda el par. En "Ver todas" sí es el dato que separa una
                      candidata de otra, y vuelve al primer plano. */}
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold tabular-nums text-foreground">
                      {scope === 'global' ? client : headline}
                    </span>
                    {isSuggested ? (
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-primary">
                        Sugerida
                      </span>
                    ) : null}
                  </span>
                  {scope === 'global' ? (
                    <span className="mt-0.5 block truncate text-xs tabular-nums text-muted-foreground">
                      {headline}
                    </span>
                  ) : null}

                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusBadge tone={statusMeta.tone} icon={statusMeta.icon}>
                      {statusMeta.label}
                    </StatusBadge>
                    {(op.delivered_amount ?? 0) > 0.01 && (op.pending_amount ?? 0) > 0.01 ? (
                      <StatusBadge tone="warning">
                        faltan {formatNumber(op.pending_amount ?? 0)} {op.currency ?? op.from_currency}
                      </StatusBadge>
                    ) : null}
                    <span className="truncate text-xs text-muted-foreground">
                      {formatCaracasShortDateTime(op.created_at)} · {formatRelativeTime(op.created_at)}
                    </span>
                  </span>

                  {coverage || (isSuggested && score) ? (
                    <span className="mt-1.5 block border-t border-dashed border-border pt-1.5">
                      {coverage && score ? (
                        <span
                          className={cn(
                            'block text-xs font-medium tabular-nums',
                            coverageTone(score),
                          )}
                        >
                          {coverage}
                        </span>
                      ) : null}
                      {/* El argumento de la sugerencia, no solo el sello. */}
                      {isSuggested && score ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {describeMatchReason(op, score, payment, suggestion?.confident ?? false)}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>

      </SidePanelBody>

      {/* La consecuencia de vincular ESTA candidata, junto al botón que la ejecuta. Antes
          el operador vinculaba y descubría el sobrante después, ya en otra pantalla. */}
      {remainder > 0.01 ? (
        <div className="flex shrink-0 items-start gap-2 border-t border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-amber-700 sm:px-5 dark:text-amber-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="text-xs text-pretty">
            Quedarán{' '}
            <span className="font-semibold tabular-nums">
              {formatNumber(remainder)} {payment.currency ?? ''}
            </span>{' '}
            sin asignar. Podrás repartirlos o acreditarlos al saldo después de vincular.
          </p>
        </div>
      ) : null}

      <SidePanelFooter>
        {onPick ? (
          <span />
        ) : (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
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
      </SidePanelFooter>

      <UnlinkOrphanDialog
        preview={orphan}
        submitting={submitting}
        onCancel={() => setOrphan(null)}
        onDecide={(action, note) => doLink(null, { action, note })}
      />
    </>
  );
}
