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
import { clientService } from '@/services/clientService';
import { formatCaracasShortDateTime, formatNumber, formatRelativeTime } from '@/utils/functions';
import { getStatusMeta } from '@/utils/operationStatus';
import type {
  OperationData,
  OperationMatchItem,
  OperationMatchScore,
  OperationSuggestion,
  OrphanAction,
  UnlinkPreview,
} from '@/types/operation';
import type { FundGroup } from '@/types/fund';
import type { PaymentData, PaymentTable } from '@/types/payment';
import { describeCoverage } from './paymentRowData';
import { CreateOperationForm } from './CreateOperationForm';
import { OutgoingCoveragePanel } from './OutgoingCoveragePanel';
import { UnlinkOrphanDialog } from './UnlinkOrphanDialog';
import {
  buildMatchQuery,
  type LinkScope as Scope,
  type LinkSortMode as SortMode,
  type LinkStatusView as StatusView,
  type ScoredOperation,
} from './linkOperationQuery';

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
  /** El alta de operación puede tomar la cabecera del cajón mientras revisa una diferencia. */
  onHeaderChange?: (header: { title: string; eyebrow: string } | null) => void;
}

function stripPhone(phone: string | null) {
  return (phone || '').replace(/@(c|g)\.us$/, '');
}

function samePhone(a: string | null, b: string | null) {
  const na = stripPhone(a).replace(/\D/g, '');
  const nb = stripPhone(b).replace(/\D/g, '');
  return na !== '' && na === nb;
}

/** Verde cuando calza, ámbar cuando deja remanente que habrá que repartir, gris si falta. */
function coverageTone(score: OperationMatchScore) {
  if (score.within_tolerance) return 'text-emerald-600 dark:text-emerald-400';
  if ((score.delta ?? 0) < 0) return 'text-amber-700 dark:text-amber-400';
  return 'text-muted-foreground';
}

/** Cuánto esperar tras la última tecla antes de volver a pedirle candidatas al servidor. */
const SEARCH_DEBOUNCE_MS = 300;

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
  onHeaderChange,
}: LinkOperationPanelProps) {
  // Lo que respondió la última consulta al servidor: cada candidata ya trae su puntuación
  // contra este comprobante en la MISMA respuesta (`POST /operations/match` filtra, puntúa y
  // ordena en un solo viaje — antes eran dos consultas, `GET /operations` y
  // `POST /operations/match`, cruzadas por uuid en el navegador).
  const [items, setItems] = useState<OperationMatchItem[]>([]);
  // La operación ya vinculada a este pago (si la hay) se pide aparte, SIEMPRE, sin importar
  // el alcance/búsqueda/pestaña de turno: si no, cambiar de pestaña podía hacer "desaparecer"
  // del cajón la operación que el pago ya tiene enganchada.
  const [linkedOp, setLinkedOp] = useState<OperationData | null>(null);
  // Sugerencia del backend para el filtro/orden actuales — viaja en la misma respuesta que
  // `items`, así que ya no hace falta pedirla ni cruzarla aparte.
  const [suggestion, setSuggestion] = useState<OperationSuggestion | null>(null);
  // Total tras el filtro (no `items.length`): con esto se sabe si "Cargar más" tiene sentido.
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  // Lo que de verdad viaja al servidor: se actualiza con retraso para no disparar una
  // consulta por cada tecla (ver el efecto de debounce, más abajo).
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scope, setScope] = useState<Scope>('auto');
  const [statusView, setStatusView] = useState<StatusView>('active');
  const [sortMode, setSortMode] = useState<SortMode>('suggested');
  // Teléfono con el que se filtra en el servidor cuando el alcance es del cliente. Empieza
  // con el remitente del comprobante (respuesta inmediata) y se corrige solo si el pago
  // resulta transferido a otro cliente (ver el efecto de abajo) — ahí SÍ hay que consultar
  // por el teléfono del nuevo dueño, no el de quien mandó el dinero.
  const [queryPhone, setQueryPhone] = useState<string | null>(null);
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
  // Descarta la respuesta de "Cargar más" si mientras viajaba cambió el filtro (búsqueda,
  // orden, pestaña, alcance): esa página ya no corresponde a lo que se está pintando. La
  // consulta principal (efecto de abajo) sube este contador en cada disparo; "Cargar más"
  // sólo aplica su respuesta si el contador sigue igual a como estaba cuando la pidió.
  const queryGeneration = useRef(0);

  const isGroup = (payment.client_phone || '').endsWith('@g.us');

  // Catálogo de grupos: no depende del pago que se esté vinculando, así que se pide una sola
  // vez al montar el cajón en vez de repetirlo cada vez que cambia de comprobante.
  useEffect(() => {
    fundService.getGroups().then((res) => {
      if (res.success && res.data) setGroups(res.data);
    });
  }, []);

  // Al cambiar de comprobante: vuelve a foja cero (selección, buscador, alcance, pestaña,
  // orden) y dispara lo que solo depende del PAGO, no del alcance/búsqueda/orden que elija
  // el operador después — la operación ya vinculada, y a qué teléfono apunta el filtro por
  // cliente. Las candidatas puntuadas ahora dependen también del filtro/orden, así que esa
  // consulta vive en el efecto de más abajo, no aquí.
  useEffect(() => {
    setSelected(payment.operation_uuid);
    setSearch('');
    setDebouncedSearch('');
    setScope('auto');
    setStatusView('active');
    setSortMode('suggested');
    autoPickedFor.current = null;
    setLinkedOp(null);
    let active = true;

    if (payment.operation_uuid) {
      operationService.getOperation(payment.operation_uuid).then((res) => {
        if (active && res.success && res.data) setLinkedOp(res.data);
      });
    }

    if (isGroup) {
      setQueryPhone(null);
    } else {
      // Primer intento: el remitente del comprobante — responde al toque y acierta salvo en
      // el caso de una transferencia. Si `client_uuid` apunta a OTRO cliente (pago
      // transferido con "Transferir a otro cliente", que siempre deja el pago sin operación
      // — `paymentTransfer.ts:transferUnlinksOperation`), se corrige por el teléfono real del
      // dueño en cuanto responde `clientService`: como `queryPhone` es una dependencia de la
      // consulta principal (más abajo), corregirlo dispara sola una segunda consulta.
      setQueryPhone(payment.client_phone || null);
      if (payment.client_uuid) {
        clientService.getClient(payment.client_uuid).then((res) => {
          if (active && res.success && res.data?.phone) setQueryPhone(res.data.phone);
        });
      }
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isGroup sale de payment.client_phone
  }, [payment, table]);

  // Debounce del buscador: la búsqueda ahora la resuelve el servidor (`search` de
  // `POST /operations/match`), así que cada tecla dispararía una consulta nueva sin este
  // retraso.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // La consulta de verdad: cambiar de alcance, de teléfono resuelto, de búsqueda (con
  // retraso), de pestaña de estado o de orden arma una petición nueva a
  // `POST /operations/match` — filtro, puntuación Y orden en un solo viaje, siempre desde la
  // página 1. `queryGeneration` descarta tanto una respuesta tardía de ESTA consulta como
  // cualquier "Cargar más" que hubiera quedado en vuelo de la consulta anterior.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setPage(1);
    const generation = ++queryGeneration.current;
    const query = buildMatchQuery({
      paymentId: payment.id,
      table,
      isGroup,
      scope,
      clientPhone: queryPhone,
      search: debouncedSearch,
      statusView,
      sortMode,
      page: 1,
    });
    operationService.rankForPayment(query).then((res) => {
      if (!active || queryGeneration.current !== generation) return;
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setSuggestion(res.data.suggestion);
      } else {
        setItems([]);
        setTotal(0);
        setSuggestion(null);
        toast.error(res.error || 'No se pudieron cargar las operaciones');
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isGroup, scope, queryPhone, debouncedSearch, table, statusView, sortMode, payment.id]);

  // Pide la página siguiente del MISMO filtro/orden y la agrega al final — no reemplaza lo ya
  // pintado. Paginar así (en vez de números de página) porque el operador está en móvil a
  // menudo: un botón "Cargar más" al fondo de una lista que ya se scrollea es el patrón que
  // menos fricción agrega, y no exige calcular ni tocar controles de paginación en pantallas
  // angostas.
  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    const generation = queryGeneration.current;
    setLoadingMore(true);
    const query = buildMatchQuery({
      paymentId: payment.id,
      table,
      isGroup,
      scope,
      clientPhone: queryPhone,
      search: debouncedSearch,
      statusView,
      sortMode,
      page: nextPage,
    });
    operationService.rankForPayment(query).then((res) => {
      setLoadingMore(false);
      // El filtro pudo cambiar mientras esta página viajaba: esa respuesta ya no aplica.
      if (queryGeneration.current !== generation) return;
      if (res.success && res.data) {
        setItems((prev) => [...prev, ...res.data!.items]);
        setTotal(res.data.total);
        setPage(nextPage);
      } else {
        toast.error(res.error || 'No se pudieron cargar más operaciones');
      }
    });
  };

  const matchedGroup = useMemo(
    () => (isGroup ? groups.find((g) => g.whatsapp_group_jid === payment.client_phone) : undefined),
    [isGroup, groups, payment.client_phone],
  );

  // Las operaciones de la última respuesta, sin su puntuación (la puntuación se consulta
  // aparte más abajo, en `scores`, porque `linkedOp` no trae score propio y hay que poder
  // mezclarla igual).
  const operations = useMemo(() => items.map((item) => item.operation), [items]);

  // La respuesta del servidor más la operación ya vinculada, que siempre tiene que estar —
  // sin importar si el filtro de turno (búsqueda, pestaña, alcance) la habría dejado fuera.
  const operationsWithLinked = useMemo(() => {
    if (!linkedOp) return operations;
    return operations.some((op) => op.uuid === linkedOp.uuid) ? operations : [linkedOp, ...operations];
  }, [operations, linkedOp]);

  // Lo único que queda por acotar en el navegador: la membresía de grupo (el servidor no
  // sabe qué operaciones son "del grupo" — se resuelven por `fund_group_uuid`, por el socio
  // que las recibió, o por el teléfono de un socio, y mezclar esas tres reglas en un filtro
  // de servidor no tiene una forma limpia hoy) y qué operaciones ya están tomadas de este
  // lado (el backend tampoco expone eso como filtro). Para el cliente individual y para "Ver
  // todas" el servidor YA filtró por completo — aquí solo se excluye lo tomado.
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

    if (scope === 'global' || !isGroup) {
      return operationsWithLinked.filter(notTaken);
    }

    if (!matchedGroup) return [];
    // Ops del grupo: las etiquetadas con el fund_group, o las de sus miembros (recibidas por
    // un miembro, o cuyo cliente es el número de un miembro/socio). La operación ya vinculada
    // pasa siempre, aunque no calce con la membresía actual del grupo.
    const memberUserUuids = new Set((matchedGroup.members ?? []).map((m) => m.user_uuid));
    const memberPhones = new Set(
      (matchedGroup.members ?? [])
        .map((m) => stripPhone(m.whatsapp_phone ?? null).replace(/\D/g, ''))
        .filter(Boolean),
    );
    return operationsWithLinked
      .filter(
        (op) =>
          op.uuid === payment.operation_uuid ||
          op.fund_group_uuid === matchedGroup.uuid ||
          (op.received_by_user_uuid && memberUserUuids.has(op.received_by_user_uuid)) ||
          (op.client_phone && memberPhones.has(stripPhone(op.client_phone).replace(/\D/g, ''))),
      )
      .filter(notTaken);
  }, [payment.operation_uuid, operationsWithLinked, scope, isGroup, matchedGroup, table]);

  const availableByStatus = useMemo(() => {
    // "Completadas" ya llegó filtrada del servidor (`status=COMPLETED` en `buildMatchQuery`).
    // "Activas" no —QUOTED-o-PENDING no es un solo `status`— así que esa mitad sigue aquí.
    if (table !== 'outgoing' || statusView === 'completed') return scoped;
    return scoped.filter((op) => {
      if (op.uuid === payment.operation_uuid) return true;
      return op.status === 'QUOTED' || op.status === 'PENDING';
    });
  }, [payment.operation_uuid, scoped, statusView, table]);

  // ¿Se puede comparar? Sin monto en el comprobante no hay sugerencia ni orden por cercanía.
  const scorable = payment.amount != null && payment.amount > 0;

  // Puntuación de cada candidata contra este comprobante: ya viene calculada en la MISMA
  // respuesta que trajo `items` (antes salía de una consulta aparte y se cruzaba por uuid).
  const scores = useMemo(
    () => new Map(items.map((item) => [item.operation.uuid, item.score])),
    [items],
  );

  const scored = useMemo<ScoredOperation[]>(
    () => availableByStatus.map((op) => ({ op, score: scores.get(op.uuid) ?? null })),
    [availableByStatus, scores],
  );

  // La sugerencia la decide el backend sobre el mismo lote filtrado que `items`; aquí solo se
  // respeta si además está a la vista (la pestaña "Activas" puede esconderla del lado del
  // cliente, ya que el servidor no filtra QUOTED-o-PENDING como un único `status`).
  const visibleSuggestion = useMemo(() => {
    if (!suggestion) return null;
    return availableByStatus.some((op) => op.uuid === suggestion.uuid) ? suggestion : null;
  }, [suggestion, availableByStatus]);

  // Si la sugerencia es inequívoca, queda preseleccionada — el operador todavía tiene que
  // confirmar con Continuar/Vincular, así que nunca se vincula nada solo.
  useEffect(() => {
    if (payment.operation_uuid) return;
    if (autoPickedFor.current === payment.id) return;
    if (!visibleSuggestion?.confident) return;
    autoPickedFor.current = payment.id;
    setSelected(visibleSuggestion.uuid);
  }, [payment.id, payment.operation_uuid, visibleSuggestion]);

  // Cuántas quedan detrás de lo ya cargado: el pie de la lista ofrece "Cargar más" mientras
  // esto sea cierto. `total` es del backend, con el mismo filtro que `items` (antes de
  // recortar por grupo/estado en el navegador) — sigue siendo correcto aunque la lista visible
  // (`scored`) sea más corta por esos filtros locales.
  const hasMore = items.length < total;

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
    () => operationsWithLinked.find((op) => op.uuid === selected) ?? null,
    [operationsWithLinked, selected],
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
        onHeaderChange={onHeaderChange}
      />
    );
  }

  /**
   * La acción principal del paso de selección, separada del botón que la dispara.
   *
   * El panel no era un `<form>`, así que Enter en el buscador no hacía nada: había que
   * soltar el teclado e ir al ratón justo después de teclear. Ahora cada paso es un
   * formulario y el mismo Enter confirma lo que confirma el botón del pie.
   */
  const submitPick = () => {
    if (submitting || !selected) return;
    if (onPick) {
      const op = operationsWithLinked.find((o) => o.uuid === selected);
      if (op) onPick(op);
      return;
    }
    if (table === 'outgoing') {
      setMode('coverage');
      return;
    }
    doLink(selected);
  };

  if (mode === 'coverage' && selectedOp) {
    const client = selectedOp.client_display_name || stripPhone(selectedOp.client_phone) || 'Cliente';
    return (
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (!submitting) doLink(selectedOp.uuid);
        }}
      >
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
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Vincular'}
          </Button>
        </SidePanelFooter>
      </form>
    );
  }

  return (
    <>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          submitPick();
        }}
      >
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
        ) : scored.length === 0 && !hasMore ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {table === 'outgoing' && statusView === 'completed'
              ? 'No hay operaciones completadas con saldo por cubrir en este alcance.'
              : scope === 'global'
              ? 'Sin operaciones que coincidan.'
              : 'Sin cotizaciones en este alcance. Prueba "Ver todas".'}
          </p>
        ) : (
          <>
          {scored.map(({ op, score }) => {
            const isSel = selected === op.uuid;
            const isSuggested = visibleSuggestion?.uuid === op.uuid;
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
                          {describeMatchReason(op, score, payment, visibleSuggestion?.confident ?? false)}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
          {hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-9 text-xs"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </Button>
            </div>
          ) : null}
          </>
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
            <Button type="submit" disabled={!selected}>
              {pickLabel}
            </Button>
          ) : table === 'outgoing' ? (
            <Button type="submit" disabled={submitting || !selected}>
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting || !selected}>
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
      </form>

      <UnlinkOrphanDialog
        preview={orphan}
        submitting={submitting}
        onCancel={() => setOrphan(null)}
        onDecide={(action, note) => doLink(null, { action, note })}
      />
    </>
  );
}
