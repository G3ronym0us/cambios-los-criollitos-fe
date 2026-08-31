'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { clientService } from '@/services/clientService';
import { operationService } from '@/services/operationService';
import { ClientData } from '@/types/client';
import {
  pairsOf,
  pendingByClient,
  pendingTotals,
  type PendingTotals,
} from '../_lib/pending';

export type BoolFilter = 'ALL' | 'YES' | 'NO';

/** Cómo se ordena la lista. Por monto sólo tiene sentido con el filtro de pendiente. */
export type ClientsSort = 'amount' | 'age' | 'name';

export interface ClientsFilters {
  search: string;
  /** «Con pendiente»: sólo los clientes a los que les debemos algo. */
  pending: BoolFilter;
  /** Símbolo del par al que acotar la deuda ("USD/VES"), o `''` para todos. */
  pair: string;
}

const emptyFilters: ClientsFilters = { search: '', pending: 'ALL', pair: '' };

/**
 * Techo de operaciones sin cubrir que se traen para agregar la deuda en memoria. Es el
 * mismo apaño que el `limit: 500` de los clientes y tiene el mismo problema: pasado el
 * techo los totales mienten. Por eso la pantalla avisa cuando lo toca, y por eso
 * `docs/api/clients-pending.md` pide el agregado en servidor.
 */
const PENDING_LIMIT = 500;

export function useClients() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientsFilters>(emptyFilters);
  const [sort, setSort] = useState<ClientsSort>('name');

  // Deuda por cliente, agregada en el front a partir de las operaciones sin cubrir.
  const [pending, setPending] = useState<Map<string, NonNullable<ClientData['pending_by_pair']>>>(
    new Map(),
  );
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingCapped, setPendingCapped] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await clientService.getClients({ limit: 500 });
    if (result.success && result.data) {
      const items = result.data.items || [];
      setClients(items);
      setTotal(result.data.total ?? items.length);
    } else {
      setError(result.error || 'Error al cargar los clientes');
    }
    setLoading(false);
  }, []);

  /**
   * `needs=settle` es, en el servidor, exactamente «le falta cobertura»: las operaciones
   * cuyo `pending_amount` no cubre ningún comprobante. Es la misma bandeja que la pantalla
   * de Operaciones llama «por cuadrar», leída desde el lado del cliente.
   */
  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    const result = await operationService.getOperations({
      needs: 'settle',
      limit: PENDING_LIMIT,
    });
    if (result.success && result.data) {
      setPending(pendingByClient(result.data.operations));
      setPendingCapped(result.data.total > result.data.operations.length);
    } else {
      // Que falle la deuda no puede tumbar el directorio: la lista sigue siendo útil sin
      // la columna, así que se queda vacía y no se propaga el error.
      setPending(new Map());
      setPendingCapped(false);
    }
    setPendingLoading(false);
  }, []);

  const reload = useCallback(() => {
    loadClients();
    loadPending();
  }, [loadClients, loadPending]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const resetFilters = useCallback(() => {
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
      const entries = pending.get(client.uuid) ?? [];
      const scoped = filters.pair
        ? entries.filter((entry) => entry.pair_symbol === filters.pair)
        : entries;
      return {
        client: { ...client, pending_by_pair: scoped } satisfies ClientData,
        totals: pendingTotals(scoped),
      };
    });
  }, [clients, pending, filters.pair]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return decorated.filter(({ client, totals }) => {
      if (filters.pending !== 'ALL' && (totals.operations > 0) !== (filters.pending === 'YES')) {
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
    const totals: PendingTotals = pendingTotals(withDebt.flatMap((row) => row.client.pending_by_pair ?? []));
    return { clients: withDebt.length, totals, capped: pendingCapped };
  }, [sorted, pendingCapped]);

  /** Los pares en los que hoy hay deuda, para no ofrecer un selector con opciones muertas. */
  const pairs = useMemo(() => pairsOf(pending.values()), [pending]);

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
      if (next.pending !== filters.pending) {
        setSort(next.pending === 'YES' ? 'amount' : 'name');
      }
      setFilters(next);
    },
    [filters.pending],
  );

  return {
    state: {
      clients: sorted,
      loading,
      pendingLoading,
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
