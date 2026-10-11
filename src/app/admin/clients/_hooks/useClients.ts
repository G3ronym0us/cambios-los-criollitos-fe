'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { clientService } from '@/services/clientService';
import { ClientData } from '@/types/client';
import { isCashDebt, pendingTotals, type PendingTotals } from '../_lib/pending';

export type BoolFilter = 'ALL' | 'YES' | 'NO';

/**
 * Qué deuda buscar. Son dos direcciones y no se mezclan: en un par normal lo pendiente es
 * lo que LE DEBEMOS (su dinero entró y no hemos pagado); en uno de efectivo
 * (`settles_in_cash`) es lo que NOS DEBE (los bolívares salieron y falta su efectivo).
 * `YES` es cualquiera de las dos.
 */
export type PendingFilter = BoolFilter | 'OWED' | 'OWES';

/** Cómo se ordena la lista. Por monto sólo tiene sentido con el filtro de pendiente. */
export type ClientsSort = 'amount' | 'age' | 'name';

export interface ClientsFilters {
  search: string;
  /** Con pendiente (cualquiera), sólo lo que le debemos, sólo lo que nos debe, o sin nada. */
  pending: PendingFilter;
  /** Símbolo del par al que acotar la deuda ("USD/VES"), o `''` para todos. */
  pair: string;
}

const emptyFilters: ClientsFilters = { search: '', pending: 'ALL', pair: '' };

/**
 * Cómo abre la lista: lo que NOS DEBEN, que es lo que se persigue a diario. Es el efectivo
 * de USD-VES —el único par que se cambia en efectivo—; el par concreto se pone en cuanto
 * llegan los datos (ver `loadClients`), porque su símbolo lo dice el servidor.
 */
const defaultFilters: ClientsFilters = { ...emptyFilters, pending: 'OWES' };

export function useClients() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // La home enlaza aquí con `?pending=1`: la tarjeta de «por entregar» pulsada allá debe
  // llegar con el filtro ya puesto, no obligar a un segundo toque sobre el desplegable.
  const fromHome = searchParams.get('pending') === '1';
  const [filters, setFilters] = useState<ClientsFilters>(() =>
    fromHome ? { ...emptyFilters, pending: 'YES' } : defaultFilters,
  );
  // Abre como lista de trabajo —con deuda—, así que el orden por defecto es el de monto.
  const [sort, setSort] = useState<ClientsSort>('amount');
  // Si el operador ya tocó los filtros, la carga no se los pisa.
  const touched = useRef(fromHome);


  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await clientService.getClients({ limit: 500 });
    if (result.success && result.data) {
      const items = result.data.items || [];
      setClients(items);
      if (!touched.current) {
        const cashPair = items
          .flatMap((client) => client.pending_by_pair ?? [])
          .find((entry) => entry.settles_in_cash)?.pair_symbol;
        if (cashPair) setFilters((current) => ({ ...current, pair: cashPair }));
      }
      setTotal(result.data.total ?? items.length);
    } else {
      setError(result.error || 'Error al cargar los clientes');
    }
    setLoading(false);
  }, []);

  const reload = useCallback(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const resetFilters = useCallback(() => {
    touched.current = true;
    setFilters(emptyFilters);
    setSort('name');
  }, []);

  const hasActiveFilters =
    filters.search.trim() !== '' || filters.pending !== 'ALL' || filters.pair !== '';

  /**
   * Cada cliente con su deuda ya acotada al par filtrado. El filtro de par recorta lo que
   * se ve del cliente, no sólo qué clientes salen: con USD/VES puesto, un cliente que
   * además debe en VES/COP enseña sólo la parte de USD/VES.
   */
  const decorated = useMemo(() => {
    return clients.map((client) => {
      const entries = client.pending_by_pair ?? [];
      // Igual que el par, la dirección recorta lo que se ve: con «Nos deben» puesto, un
      // cliente al que además le debemos algo enseña sólo lo que él nos debe.
      const scoped = entries.filter(
        (entry) =>
          (!filters.pair || entry.pair_symbol === filters.pair) &&
          (filters.pending !== 'OWED' || !entry.settles_in_cash) &&
          (filters.pending !== 'OWES' || entry.settles_in_cash),
      );
      return {
        client: { ...client, pending_by_pair: scoped } satisfies ClientData,
        totals: pendingTotals(scoped),
      };
    });
  }, [clients, filters.pair, filters.pending]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return decorated.filter(({ client, totals }) => {
      if (filters.pending !== 'ALL' && (totals.operations > 0) !== (filters.pending !== 'NO')) {
        return false;
      }
      // Pedir un par es pedir deuda en ese par: un cliente sin nada ahí no pinta nada.
      if (filters.pair && totals.operations === 0) return false;
      if (!q) return true;
      return (
        (client.display_name || '').toLowerCase().includes(q) ||
        client.phone.toLowerCase().includes(q)
      );
    });
  }, [decorated, filters]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    if (sort === 'amount') {
      // Monedas distintas no se comparan de verdad; dentro de un par —que es cuando este
      // orden se usa— sí, y sin par sigue siendo mejor guía que el alfabético.
      rows.sort((a, b) => b.totals.amount - a.totals.amount);
    } else if (sort === 'age') {
      rows.sort((a, b) => {
        const left = a.totals.oldest_at ? new Date(a.totals.oldest_at).getTime() : Infinity;
        const right = b.totals.oldest_at ? new Date(b.totals.oldest_at).getTime() : Infinity;
        return left - right;
      });
    } else {
      rows.sort((a, b) =>
        (a.client.display_name || a.client.phone).localeCompare(b.client.display_name || b.client.phone),
      );
    }
    return rows;
  }, [filtered, sort]);

  /** El resumen de la franja: sólo cuenta lo que está a la vista tras los filtros. */
  const pendingSummary = useMemo(() => {
    const withDebt = sorted.filter((row) => row.totals.operations > 0);
    const entries = withDebt.flatMap((row) => row.client.pending_by_pair ?? []);
    const totals: PendingTotals = pendingTotals(entries);
    // El rótulo depende de qué se está sumando: efectivo que nos deben, plata que debemos,
    // o una mezcla de las dos que no admite ninguno de los dos nombres.
    const label = isCashDebt(entries)
      ? 'por cobrar'
      : entries.some((entry) => entry.settles_in_cash)
        ? 'pendiente'
        : 'por entregar';
    return { clients: withDebt.length, totals, label };
  }, [sorted]);

  /**
   * Las opciones del selector de par.
   *
   * Son los pares en los que hoy hay deuda MÁS el par preferido de cada cliente. Con sólo
   * los primeros, el día que nadie debe nada el selector desaparecía de la tira — un filtro
   * que se esfuma según el dato es un filtro que no se puede usar, y el operador no tiene
   * manera de saber que existió.
   */
  const pairs = useMemo(() => {
    const symbols = new Set<string>();
    for (const client of clients) {
      for (const entry of client.pending_by_pair ?? []) symbols.add(entry.pair_symbol);
      if (client.preferred_pair_symbol) symbols.add(client.preferred_pair_symbol);
    }
    return [...symbols].sort((a, b) => a.localeCompare(b));
  }, [clients]);

  // Clientes que exceden el límite de carga y no están en memoria (ni en la búsqueda).
  const hiddenCount = Math.max(0, total - clients.length);

  // Alta de un negocio sin teléfono propio (cliente-entidad).
  const createEntity = useCallback(
    async (displayName: string, groupJid: string | null): Promise<boolean> => {
      const result = await clientService.createEntity({
        display_name: displayName,
        linked_group_jid: groupJid,
      });
      if (!result.success) {
        toast.error(result.error || 'No se pudo crear la entidad');
        return false;
      }
      toast.success('Entidad creada');
      loadClients();
      return true;
    },
    [loadClients],
  );

  /**
   * Activar «Con pendiente» cambia a qué viniste: deja de ser el directorio y pasa a ser
   * la lista de trabajo, así que el orden por defecto pasa a monto. Apagarlo lo devuelve.
   */
  const applyFilters = useCallback(
    (next: ClientsFilters) => {
      touched.current = true;
      const working = (pending: PendingFilter) => pending !== 'ALL' && pending !== 'NO';
      if (working(next.pending) !== working(filters.pending)) {
        setSort(working(next.pending) ? 'amount' : 'name');
      }
      setFilters(next);
    },
    [filters.pending],
  );

  return {
    state: {
      clients: sorted,
      loading,
      error,
      filters,
      sort,
      pairs,
      total,
      pendingSummary,
      hasActiveFilters,
      hiddenCount,
    },
    actions: { setFilters: applyFilters, setSort, resetFilters, reload, createEntity },
  };
}

export type ClientRow = ReturnType<typeof useClients>['state']['clients'][number];
