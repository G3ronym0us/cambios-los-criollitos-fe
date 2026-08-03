'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { paymentService } from '@/services/paymentService';
import type { DateRange } from '@/lib/dateRange';
import {
  AttentionFilter,
  PaymentData,
  PaymentStats,
  PaymentSuggestion,
  PaymentTable,
} from '@/types/payment';

export type OutgoingClass = 'ALL' | 'UNLINKED' | 'OPERATIONAL' | 'LOAN' | 'PERSONAL' | 'IRRELEVANT';

const OUT_CLASSES: OutgoingClass[] = ['ALL', 'UNLINKED', 'OPERATIONAL', 'LOAN', 'PERSONAL', 'IRRELEVANT'];
const ATTENTION_FILTERS: AttentionFilter[] = ['ALL', 'ATTENTION', 'RECONCILED'];

const TAB_STORAGE_KEY = 'payments-active-tab';
// Fila a la que volver tras "Ver operación" (sessionStorage, lo escribe la lista).
export const PAYMENT_FOCUS_KEY = 'payments-focus';
const PAGE_SIZE = 50;
const MAX_REQUEST_SIZE = 200; // límite del backend por petición
const FOCUS_MAX_ITEMS = 500; // tope de páginas a cargar buscando la fila de retorno
const SEARCH_DEBOUNCE_MS = 300;

export function usePayments() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Estado inicial desde la URL (volver atrás restaura los filtros) ───────
  const initialTabParam = useRef(searchParams.get('tab'));
  const [tab, setTab] = useState<PaymentTable>(() =>
    searchParams.get('tab') === 'outgoing' ? 'outgoing' : 'incoming',
  );
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [outClass, setOutClass] = useState<OutgoingClass>(() => {
    const c = searchParams.get('class') as OutgoingClass | null;
    return c && OUT_CLASSES.includes(c) ? c : 'ALL';
  });
  const [attention, setAttention] = useState<AttentionFilter>(() => {
    const a = searchParams.get('att') as AttentionFilter | null;
    return a && ATTENTION_FILTERS.includes(a) ? a : 'ALL';
  });
  const [range, setRange] = useState<DateRange>(() => ({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  }));
  const [debouncedSearch, setDebouncedSearch] = useState(() => (searchParams.get('q') ?? '').trim());

  // Lista de la pestaña activa (acumulada por scroll infinito).
  const [items, setItems] = useState<PaymentData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Diferenciamos "no hay pagos" de "no se pudieron cargar": el diseño les da pantallas distintas.
  const [error, setError] = useState<string | null>(null);

  // Totales sin filtrar por tabla (para los badges de las pestañas).
  const [totalIncoming, setTotalIncoming] = useState(0);
  const [totalOutgoing, setTotalOutgoing] = useState(0);

  // Agregados de la franja de atención y sugerencias de las filas cargadas.
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [suggestions, setSuggestions] = useState<Record<number, PaymentSuggestion>>({});

  // Fila a enfocar (retorno desde el detalle de operación).
  const pendingFocus = useRef<{ table: PaymentTable; id: number } | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);

  // Solo aplica clasificación a salientes.
  const effectiveOutClass = tab === 'outgoing' ? outClass : 'ALL';

  // Guard de carrera: ignora respuestas de peticiones que ya no son la última.
  const reqId = useRef(0);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      outClass: effectiveOutClass,
      dateFrom: range.from,
      dateTo: range.to,
    }),
    [debouncedSearch, effectiveOutClass, range.from, range.to],
  );

  // ── Pestaña inicial: foco pendiente > ?tab= de la URL > pestaña persistida ─
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PAYMENT_FOCUS_KEY);
      if (raw) {
        window.sessionStorage.removeItem(PAYMENT_FOCUS_KEY);
        const f = JSON.parse(raw) as { table?: string; id?: number };
        if ((f.table === 'incoming' || f.table === 'outgoing') && typeof f.id === 'number') {
          pendingFocus.current = { table: f.table, id: f.id };
          setTab(f.table);
          window.localStorage.setItem(TAB_STORAGE_KEY, f.table);
          return;
        }
      }
    } catch {
      /* storage no disponible */
    }
    if (initialTabParam.current) return; // la URL manda
    const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (saved === 'incoming' || saved === 'outgoing') setTab(saved);
  }, []);

  const selectTab = useCallback((value: PaymentTable) => {
    setTab(value);
    window.localStorage.setItem(TAB_STORAGE_KEY, value);
  }, []);

  // ── Debounce de la búsqueda ───────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // ── Filtros → URL (replace, sin scroll ni historial nuevo) ────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab === 'outgoing') params.set('tab', 'outgoing');
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (tab === 'outgoing' && outClass !== 'ALL') params.set('class', outClass);
    if (attention !== 'ALL') params.set('att', attention);
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [tab, debouncedSearch, outClass, attention, range.from, range.to, pathname, router]);

  // ── Totales sin filtrar (badges de pestaña) ───────────────────────────────
  const loadTotals = useCallback(async () => {
    const [inc, out] = await Promise.all([
      paymentService.getPayments('incoming', { limit: 1 }),
      paymentService.getPayments('outgoing', { limit: 1 }),
    ]);
    if (inc.success && inc.data) setTotalIncoming(inc.data.total);
    if (out.success && out.data) setTotalOutgoing(out.data.total);
  }, []);

  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  // ── Franja de atención ────────────────────────────────────────────────────
  // No depende de `attention`: es la cifra que ese propio segmento selecciona.
  // Lleva su propio guard de carrera: al cambiar de pestaña salen dos peticiones y si la
  // de entrantes contesta la última, la franja se queda anunciando el saldo de la otra bandeja.
  const statsReqId = useRef(0);
  const loadStats = useCallback(async () => {
    const id = ++statsReqId.current;
    const res = await paymentService.getStats(tab, filters);
    if (id !== statsReqId.current) return;
    setStats(res.success && res.data ? res.data : null);
  }, [tab, filters]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Sugerencias de las filas visibles ─────────────────────────────────────
  // Solo para lo que no tiene destino: en una fila ya vinculada la sugerencia sobra.
  // Se piden en bloque y se acumulan, así el scroll infinito no repite lo ya resuelto.
  const askedForSuggestions = useRef<Set<number>>(new Set());

  // Cambiar de bandeja o de filtros invalida lo acumulado. Va ANTES del efecto que pide:
  // así el que pide ve el conjunto ya vacío y no se pisa con una respuesta de los filtros viejos.
  useEffect(() => {
    askedForSuggestions.current = new Set();
    setSuggestions({});
  }, [tab, filters, attention]);

  useEffect(() => {
    const pending = items
      .filter((p) => !p.operation_uuid && !p.deposit && !p.loan && p.amount != null)
      .map((p) => p.id)
      .filter((id) => !askedForSuggestions.current.has(id));
    if (pending.length === 0) return;
    pending.forEach((id) => askedForSuggestions.current.add(id));
    let active = true;
    paymentService.getSuggestions(tab, pending).then((res) => {
      if (!active || !res.success || !res.data) return;
      setSuggestions((prev) => {
        const next = { ...prev };
        for (const s of res.data!.items) next[s.payment_id] = s;
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [items, tab]);

  // ── Primera página (al cambiar pestaña / búsqueda / filtros) ──────────────
  const fetchFirstPage = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    const res = await paymentService.getPayments(tab, {
      limit: PAGE_SIZE,
      offset: 0,
      attention,
      ...filters,
    });
    if (id !== reqId.current) return; // llegó una petición más nueva
    if (res.success && res.data) {
      setItems(res.data.items);
      setTotal(res.data.total);
      setError(null);
    } else {
      setItems([]);
      setTotal(0);
      setError(res.error || 'No se pudieron cargar los pagos');
    }
    setLoading(false);
  }, [tab, attention, filters]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  // ── Cargar más (scroll infinito) ──────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || items.length >= total) return;
    setLoadingMore(true);
    const res = await paymentService.getPayments(tab, {
      limit: PAGE_SIZE,
      offset: items.length,
      attention,
      ...filters,
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, ...res.data!.items]);
      setTotal(res.data.total);
    } else {
      toast.error(res.error || 'Error al cargar más pagos');
    }
    setLoadingMore(false);
  }, [tab, attention, filters, items.length, total, loading, loadingMore]);

  // ── Retorno desde "Ver operación": cargar hasta encontrar la fila ─────────
  useEffect(() => {
    const f = pendingFocus.current;
    if (!f || loading || loadingMore || f.table !== tab) return;
    if (items.some((p) => p.id === f.id)) {
      setFocusId(f.id);
      pendingFocus.current = null;
    } else if (items.length < total && items.length < FOCUS_MAX_ITEMS) {
      loadMore();
    } else if (items.length > 0 || total === 0) {
      pendingFocus.current = null; // no está bajo estos filtros; desistir
    }
  }, [items, total, loading, loadingMore, tab, loadMore]);

  const clearFocus = useCallback(() => setFocusId(null), []);

  const showPayment = useCallback((table: PaymentTable, id: number) => {
    setSearch('');
    setDebouncedSearch('');
    setOutClass('ALL');
    setAttention('ALL');
    setRange({});
    pendingFocus.current = { table, id };
    setFocusId(id);
    selectTab(table);
    loadTotals();
  }, [loadTotals, selectTab]);

  // ── Refresco en sitio (tras vincular/marcar/etc.) ─────────────────────────
  // Recarga lo YA cargado (mismo offset acumulado) sin pasar por `loading`,
  // así la lista no colapsa a la primera página ni se pierde el scroll.
  const refreshInPlace = useCallback(async () => {
    loadTotals();
    loadStats();
    const count = Math.min(Math.max(items.length, PAGE_SIZE), 1000);
    const id = ++reqId.current;
    const requests = [];
    for (let offset = 0; offset < count; offset += MAX_REQUEST_SIZE) {
      requests.push(
        paymentService.getPayments(tab, {
          limit: Math.min(MAX_REQUEST_SIZE, count - offset),
          offset,
          attention,
          ...filters,
        }),
      );
    }
    const results = await Promise.all(requests);
    if (id !== reqId.current) return;
    if (results.every((r) => r.success && r.data)) {
      setItems(results.flatMap((r) => r.data!.items));
      setTotal(results[results.length - 1].data!.total);
    } else {
      toast.error('No se pudo refrescar la lista de pagos');
    }
  }, [items.length, tab, attention, filters, loadTotals, loadStats]);

  const reload = useCallback(() => {
    loadTotals();
    loadStats();
    fetchFirstPage();
  }, [loadTotals, loadStats, fetchFirstPage]);

  const hasActiveFilters =
    search.trim() !== '' || outClass !== 'ALL' || attention !== 'ALL' || !!range.from || !!range.to;

  const resetFilters = useCallback(() => {
    setSearch('');
    setOutClass('ALL');
    setAttention('ALL');
    setRange({});
  }, []);

  return {
    state: {
      payments: items,
      total,
      totalIncoming,
      totalOutgoing,
      stats,
      suggestions,
      loading,
      loadingMore,
      error,
      hasMore: items.length < total,
      tab,
      search,
      outClass,
      attention,
      range,
      hasActiveFilters,
      focusId,
    },
    actions: {
      setTab: selectTab,
      setSearch,
      setOutClass,
      setAttention,
      setRange,
      resetFilters,
      reload,
      refreshInPlace,
      loadMore,
      clearFocus,
      showPayment,
    },
  };
}
