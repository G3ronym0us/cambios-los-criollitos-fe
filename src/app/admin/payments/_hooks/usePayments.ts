'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { paymentService } from '@/services/paymentService';
import { PaymentData, PaymentTable } from '@/types/payment';

export type OutgoingClass = 'ALL' | 'UNLINKED' | 'OPERATIONAL' | 'PERSONAL' | 'IRRELEVANT';

const TAB_STORAGE_KEY = 'payments-active-tab';
const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

export function usePayments() {
  const [tab, setTab] = useState<PaymentTable>('incoming');
  const [search, setSearch] = useState('');
  const [outClass, setOutClass] = useState<OutgoingClass>('ALL');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Lista de la pestaña activa (acumulada por scroll infinito).
  const [items, setItems] = useState<PaymentData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Totales sin filtrar por tabla (para los badges de las pestañas).
  const [totalIncoming, setTotalIncoming] = useState(0);
  const [totalOutgoing, setTotalOutgoing] = useState(0);

  // Solo aplica clasificación a salientes.
  const effectiveOutClass = tab === 'outgoing' ? outClass : 'ALL';

  // Guard de carrera: ignora respuestas de peticiones que ya no son la última.
  const reqId = useRef(0);

  // ── Restaurar pestaña persistida ──────────────────────────────────────────
  useEffect(() => {
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
    },
    actions: { setTab: selectTab, setSearch, setOutClass, resetFilters, reload, loadMore },
  };
}
