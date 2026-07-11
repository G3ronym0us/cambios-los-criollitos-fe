'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { paymentService } from '@/services/paymentService';
import { PaymentData, PaymentTable } from '@/types/payment';

export type OutgoingClass = 'ALL' | 'UNLINKED' | 'OPERATIONAL' | 'PERSONAL' | 'IRRELEVANT';

const OUT_CLASSES: OutgoingClass[] = ['ALL', 'UNLINKED', 'OPERATIONAL', 'PERSONAL', 'IRRELEVANT'];

const TAB_STORAGE_KEY = 'payments-active-tab';
// Card a la que volver tras "Ver operación" (sessionStorage, lo escribe PaymentItem).
export const PAYMENT_FOCUS_KEY = 'payments-focus';
const PAGE_SIZE = 50;
const MAX_REQUEST_SIZE = 200; // límite del backend por petición
const FOCUS_MAX_ITEMS = 500; // tope de páginas a cargar buscando la card de retorno
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
  const [debouncedSearch, setDebouncedSearch] = useState(() => (searchParams.get('q') ?? '').trim());

  // Lista de la pestaña activa (acumulada por scroll infinito).
  const [items, setItems] = useState<PaymentData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Totales sin filtrar por tabla (para los badges de las pestañas).
  const [totalIncoming, setTotalIncoming] = useState(0);
  const [totalOutgoing, setTotalOutgoing] = useState(0);

  // Card a enfocar (retorno desde el detalle de operación).
  const pendingFocus = useRef<{ table: PaymentTable; id: number } | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);

  // Solo aplica clasificación a salientes.
  const effectiveOutClass = tab === 'outgoing' ? outClass : 'ALL';

  // Guard de carrera: ignora respuestas de peticiones que ya no son la última.
  const reqId = useRef(0);

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
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [tab, debouncedSearch, outClass, pathname, router]);

  // ── Totales sin filtrar (badges) ──────────────────────────────────────────
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

  // ── Primera página (al cambiar pestaña / búsqueda / clasificación) ────────
  const fetchFirstPage = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    const res = await paymentService.getPayments(tab, {
      limit: PAGE_SIZE,
      offset: 0,
      search: debouncedSearch,
      outClass: effectiveOutClass,
    });
    if (id !== reqId.current) return; // llegó una petición más nueva
    if (res.success && res.data) {
      setItems(res.data.items);
      setTotal(res.data.total);
    } else {
      toast.error(res.error || 'Error al cargar pagos');
    }
    setLoading(false);
  }, [tab, debouncedSearch, effectiveOutClass]);

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
      search: debouncedSearch,
      outClass: effectiveOutClass,
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, ...res.data!.items]);
      setTotal(res.data.total);
    } else {
      toast.error(res.error || 'Error al cargar más pagos');
    }
    setLoadingMore(false);
  }, [tab, debouncedSearch, effectiveOutClass, items.length, total, loading, loadingMore]);

  // ── Retorno desde "Ver operación": cargar hasta encontrar la card ─────────
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

  // ── Refresco en sitio (tras vincular/marcar/etc.) ─────────────────────────
  // Recarga lo YA cargado (mismo offset acumulado) sin pasar por `loading`,
  // así la lista no colapsa a la primera página ni se pierde el scroll.
  const refreshInPlace = useCallback(async () => {
    loadTotals();
    const count = Math.min(Math.max(items.length, PAGE_SIZE), 1000);
    const id = ++reqId.current;
    const requests = [];
    for (let offset = 0; offset < count; offset += MAX_REQUEST_SIZE) {
      requests.push(
        paymentService.getPayments(tab, {
          limit: Math.min(MAX_REQUEST_SIZE, count - offset),
          offset,
          search: debouncedSearch,
          outClass: effectiveOutClass,
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
  }, [items.length, tab, debouncedSearch, effectiveOutClass, loadTotals]);

  const reload = useCallback(() => {
    loadTotals();
    fetchFirstPage();
  }, [loadTotals, fetchFirstPage]);

  const hasActiveFilters = search.trim() !== '' || outClass !== 'ALL';
  const resetFilters = useCallback(() => {
    setSearch('');
    setOutClass('ALL');
  }, []);

  return {
    state: {
      payments: items,
      total,
      totalIncoming,
      totalOutgoing,
      loading,
      loadingMore,
      hasMore: items.length < total,
      tab,
      search,
      outClass,
      hasActiveFilters,
      focusId,
    },
    actions: {
      setTab: selectTab,
      setSearch,
      setOutClass,
      resetFilters,
      reload,
      refreshInPlace,
      loadMore,
      clearFocus,
    },
  };
}
