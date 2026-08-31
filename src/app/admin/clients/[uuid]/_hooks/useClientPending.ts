'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { OperationData } from '@/types/operation';
import {
  isPendingOperation,
  pendingByPair,
  pendingSince,
  pendingTotals,
  valueCurrency,
  type PaymentDates,
} from '../../_lib/pending';
import { loadPaymentDates } from '../../_lib/paymentDates';
import { distribute, type Distribution } from '../../_lib/distribute';
import {
  markDelivered,
  markManyDelivered,
  undoDelivery,
  undoMany,
  type CoverageSnapshot,
} from '../../_lib/pendingDelivery';

/**
 * La pestaña «Por entregar» en funcionamiento: qué se le debe al cliente y las dos maneras
 * de saldarlo — marcar a mano las que pagaste, o escribir cuánto entregaste y repartirlo.
 *
 * Trabaja sobre las operaciones que ya cargó `useClientProfile`, no vuelve a pedirlas: son
 * las mismas, filtradas. Cuando algo cambia, avisa al padre con `onChanged` para que
 * recargue de verdad.
 */

/** Una operación no se puede dar por entregada si le falta a quién entregársela. */
export function blockedReason(op: OperationData): string | null {
  if (!op.beneficiary_alias && !op.beneficiary_account_uuid) {
    return 'Sin beneficiario: lo dirá el cliente';
  }
  if (op.beneficiary_ambiguous) return 'Hay varias cuentas con ese nombre';
  return null;
}

export type PendingMode = 'select' | 'distribute';

export function useClientPending(operations: OperationData[], onChanged: () => void) {
  const [pair, setPair] = useState<string>('');
  const [mode, setMode] = useState<PendingMode>('select');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [amount, setAmount] = useState('');
  const [allowPartial, setAllowPartial] = useState(true);
  const [working, setWorking] = useState(false);
  /**
   * Lo marcado en esta sesión, para poder deshacerlo. Vive sólo en memoria: al recargar la
   * página se pierde y entonces se deshace desde el panel de cobertura de la operación.
   */
  const [undoable, setUndoable] = useState<CoverageSnapshot[]>([]);
  /** Fecha del comprobante entrante de cada op; hasta que llega se usa la de la operación. */
  const [paymentDates, setPaymentDates] = useState<PaymentDates>(new Map());

  const pending = useMemo(() => operations.filter(isPendingOperation), [operations]);

  /**
   * Resolver la fecha real cuesta una petición por operación, así que se hace una sola vez
   * por conjunto de operaciones sin cubrir — pocas, y sólo las de este cliente. La clave es
   * el propio conjunto de uuids: cambia cuando se marca o se deshace algo, no en cada render.
   */
  const pendingKey = useMemo(() => pending.map((op) => op.uuid).sort().join(','), [pending]);

  useEffect(() => {
    if (!pendingKey) {
      setPaymentDates(new Map());
      return;
    }
    let alive = true;
    loadPaymentDates(pendingKey.split(',')).then((dates) => {
      if (alive) setPaymentDates(dates);
    });
    return () => {
      alive = false;
    };
  }, [pendingKey]);

  const pairs = useMemo(
    () => [...new Set(pending.map((op) => op.pair_symbol).filter((s): s is string => !!s))].sort(),
    [pending],
  );

  const rows = useMemo(() => {
    const scoped = pair ? pending.filter((op) => op.pair_symbol === pair) : pending;
    return [...scoped].sort((a, b) => {
      const left = pendingSince(a, paymentDates);
      const right = pendingSince(b, paymentDates);
      if (!left) return right ? 1 : 0;
      if (!right) return -1;
      return new Date(left).getTime() - new Date(right).getTime();
    });
  }, [pending, pair, paymentDates]);

  const entries = useMemo(() => pendingByPair(rows, paymentDates), [rows, paymentDates]);
  const totals = useMemo(() => pendingTotals(entries), [entries]);

  /** Las que sí se pueden marcar: «seleccionar todas» nunca incluye a las trabadas. */
  const selectable = useMemo(() => rows.filter((op) => blockedReason(op) === null), [rows]);

  const selectedRows = useMemo(
    () => selectable.filter((op) => selected.has(op.uuid)),
    [selectable, selected],
  );

  const selectedEntries = useMemo(
    () => pendingByPair(selectedRows, paymentDates),
    [selectedRows, paymentDates],
  );
  const selectedTotals = useMemo(() => pendingTotals(selectedEntries), [selectedEntries]);

  /** Lo que quedaría debiéndose si se marcara lo seleccionado, por moneda. */
  const remainingEntries = useMemo(
    () => pendingByPair(rows.filter((op) => !selected.has(op.uuid)), paymentDates),
    [rows, selected, paymentDates],
  );

  /** Las trabadas por falta de datos: no reciben reparto, pero se siguen debiendo. */
  const blocked = useMemo(
    () => new Set(rows.filter((op) => blockedReason(op) !== null).map((op) => op.uuid)),
    [rows],
  );

  /**
   * Un monto entregado está en UNA moneda, así que sólo se reparte entre operaciones de esa
   * moneda: restar bolívares de una deuda en dólares daría un reparto sin sentido y un total
   * impronunciable. Con varias monedas a la vista no hay reparto hasta elegir un par — eso es
   * lo que `distributeCurrency` en `null` le dice al panel.
   */
  const distributeCurrency = totals.currency;

  const distributableRows = useMemo(
    () => (distributeCurrency ? rows.filter((op) => valueCurrency(op) === distributeCurrency) : []),
    [rows, distributeCurrency],
  );

  /**
   * Se calcula sobre todas las filas de esa moneda, no sólo sobre las repartibles: las
   * trabadas entran como excluidas para que sigan contando en «le seguirías debiendo» y se
   * vean en el previo con su motivo, en vez de desaparecer y descuadrar el total.
   */
  const preview: Distribution = useMemo(
    () =>
      distribute(
        Number(amount.replace(',', '.')),
        distributableRows.map((op) => ({
          uuid: op.uuid,
          pending: op.pending_amount ?? 0,
          since: pendingSince(op, paymentDates),
        })),
        { allowPartial, excluded: new Set([...excluded, ...blocked]) },
      ),
    [amount, distributableRows, allowPartial, excluded, blocked, paymentDates],
  );

  const toggle = useCallback((uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }, []);

  const toggleExcluded = useCallback((uuid: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(selectable.map((op) => op.uuid)));
  }, [selectable]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  /** Un lote no es atómico: se informa de lo que pasó, no de un sí o un no. */
  const report = useCallback(
    (done: number, failed: number, doneVerb: string, failedVerb: string) => {
      if (done > 0) {
        toast.success(`${done} ${done === 1 ? 'operación' : 'operaciones'} ${doneVerb}`);
        onChanged();
      }
      if (failed > 0) {
        toast.error(
          `${failed} ${failed === 1 ? 'operación quedó' : 'operaciones quedaron'} sin ${failedVerb}`,
        );
      }
    },
    [onChanged],
  );

  const markSelected = useCallback(async () => {
    if (selectedRows.length === 0) return;
    setWorking(true);
    const outcome = await markManyDelivered(selectedRows.map((op) => op.uuid));
    setWorking(false);
    setUndoable((prev) => [...prev, ...outcome.done]);
    setSelected(new Set());
    report(outcome.done.length, outcome.failed.length, 'entregadas', 'marcar');
  }, [selectedRows, report]);

  const undoOne = useCallback(
    async (uuid: string) => {
      const snapshot = undoable.find((item) => item.operationUuid === uuid);
      if (!snapshot) return;
      setWorking(true);
      const error = await undoDelivery(snapshot);
      setWorking(false);
      if (error) {
        toast.error(error);
        return;
      }
      setUndoable((prev) => prev.filter((item) => item.operationUuid !== uuid));
      toast.success('Entrega deshecha: la operación vuelve a pendiente');
      onChanged();
    },
    [undoable, onChanged],
  );

  const undoSession = useCallback(async () => {
    if (undoable.length === 0) return;
    setWorking(true);
    const outcome = await undoMany(undoable);
    setWorking(false);
    const undone = new Set(outcome.done.map((item) => item.operationUuid));
    setUndoable((prev) => prev.filter((item) => !undone.has(item.operationUuid)));
    report(outcome.done.length, outcome.failed.length, 'devueltas a pendiente', 'deshacer');
  }, [undoable, report]);

  /** Aplica el reparto que el operador está viendo: sólo las filas que reciben algo. */
  const applyDistribution = useCallback(async () => {
    const touched = preview.rows.filter((row) => row.kind !== 'none');
    if (touched.length === 0) return;

    setWorking(true);
    const done: CoverageSnapshot[] = [];
    let failed = 0;
    for (const row of touched) {
      const result = await markDelivered(row.uuid, row.applied);
      if (typeof result === 'string') failed += 1;
      else done.push(result);
    }
    setWorking(false);

    setUndoable((prev) => [...prev, ...done]);
    setAmount('');
    setExcluded(new Set());
    if (done.length > 0) setMode('select');
    report(done.length, failed, 'entregadas', 'marcar');
  }, [preview, report]);

  return {
    state: {
      rows,
      entries,
      totals,
      remainingEntries,
      distributeCurrency,
      distributableRows,
      pairs,
      pair,
      mode,
      selected,
      selectedRows,
      selectedTotals,
      selectedEntries,
      selectable,
      excluded,
      amount,
      allowPartial,
      preview,
      working,
      undoable,
      paymentDates,
    },
    actions: {
      setPair,
      setMode,
      toggle,
      toggleExcluded,
      selectAll,
      clearSelection,
      setAmount,
      setAllowPartial,
      markSelected,
      undoOne,
      undoSession,
      applyDistribution,
    },
  };
}
