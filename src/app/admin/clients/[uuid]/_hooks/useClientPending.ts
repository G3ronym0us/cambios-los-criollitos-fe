'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { clientService } from '@/services/clientService';
import { useConfirm } from '@/hooks/useConfirm';
import { formatAmountForInput, formatCaracasShortDateTime } from '@/utils/functions';
import type { PendingDelivery, PendingDeliveryInput } from '@/types/client';
import type { OperationData } from '@/types/operation';
import {
  formatPending,
  isPendingOperation,
  pendingByPair,
  pendingSince,
  pendingTotals,
  valueCurrency,
} from '../../_lib/pending';
import { distribute } from '../../_lib/distribute';

/**
 * El filtro «Por entregar» de la pestaña Cuenta en funcionamiento: qué se le debe al cliente
 * y las dos maneras de saldarlo — marcar a mano las que pagaste, o escribir cuánto
 * entregaste y repartirlo.
 *
 * Recibe las operaciones YA acotadas al par elegido —el par vive arriba, en Cuenta, porque
 * es común a todos los filtros— y se queda con las que están sin cubrir Y ya pagadas. Las
 * operaciones no las pide: son las que ya cargó `useClientProfile`; lo único que sí pide
 * son los lotes de entrega, para poder deshacerlos. Cuando algo cambia, avisa con
 * `onChanged` para que el perfil recargue de verdad.
 *
 * ### Entregar es un lote, y deshacer también
 *
 * `POST /clients/{uuid}/pending/deliver` marca todo el lote en una transacción: o entran
 * todas o no entra ninguna, así que no hay «tres marcadas y dos no» que reconciliar a
 * mano. Y `.../deliveries/{uuid}/undo` devuelve el lote entero reponiendo el hueco previo
 * de cada operación, sin borrar el rastro y sin límite de tiempo.
 *
 * De ahí sale la única aspereza de la pantalla: **deshacer es por lote, no por fila**. El
 * botón de una fila deshace el lote en el que se marcó, y cuando ese lote lleva más de una
 * operación se pregunta antes, con el número delante.
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

/** Debajo de esto es ruido de redondeo, no dinero. Igual que en el backend. */
const EPSILON = 0.01;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Lo que el operador escribe viene con coma decimal y puede estar a medio escribir. */
function toNumber(text: string): number {
  const value = Number(String(text).replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}



export function useClientPending(
  clientUuid: string,
  operations: OperationData[],
  onChanged: () => void,
) {
  const confirm = useConfirm();
  const [mode, setMode] = useState<PendingMode>('select');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [amount, setAmount] = useState('');
  /**
   * El reparto se hace en DOS pasos: primero cuánto entregó, y sólo después entre cuáles se
   * coloca. Antes eran una sola pantalla en la que el monto y el reparto se recalculaban
   * bajo el ratón; separarlos deja claro que el segundo paso es sobre una cifra ya fijada.
   */
  const [step, setStep] = useState<'amount' | 'split'>('amount');
  /**
   * Cuánto va a cada operación, como TEXTO porque el operador lo edita.
   *
   * El reparto por antigüedad es la propuesta de partida, no la regla: se siembra al pasar
   * al paso 2 y a partir de ahí manda lo que haya aquí.
   */
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);
  /**
   * Los lotes de entrega que siguen en pie, los últimos primero.
   *
   * Vienen del servidor, así que sobreviven a recargar la página: deshacer un error que se
   * descubre mañana ya no obliga a entrar operación por operación al panel de cobertura.
   */
  const [undoable, setUndoable] = useState<PendingDelivery[]>([]);
  /**
   * Los lotes marcados en ESTA sesión.
   *
   * La cola sigue enseñando sus operaciones aunque ya no deban nada, para que el botón de
   * deshacer siga a mano el segundo siguiente. Los lotes viejos no: meterlos devolvería a
   * una lista de trabajo decenas de operaciones ya entregadas. Ésos se deshacen desde la
   * tira de abajo, que sí los lista.
   */
  const [sessionDeliveries, setSessionDeliveries] = useState<ReadonlySet<string>>(new Set());

  const loadDeliveries = useCallback(async () => {
    const result = await clientService.getPendingDeliveries(clientUuid);
    if (!result.success || !result.data) return;
    setUndoable(result.data.filter((delivery) => delivery.undone_at === null));
  }, [clientUuid]);

  useEffect(() => {
    void loadDeliveries();
  }, [loadDeliveries]);

  /** De qué lote salió cada operación entregada: es lo que deshace el botón de la fila. */
  const deliveryByOperation = useMemo(() => {
    const map = new Map<string, PendingDelivery>();
    for (const delivery of undoable) {
      for (const item of delivery.items) {
        if (item.operation_uuid) map.set(item.operation_uuid, delivery);
      }
    }
    return map;
  }, [undoable]);

  /** Las operaciones que siguen en la cola sólo para poder deshacerlas. */
  const undoableIds = useMemo(() => {
    const ids = new Set<string>();
    for (const delivery of undoable) {
      if (!sessionDeliveries.has(delivery.uuid)) continue;
      for (const item of delivery.items) {
        if (item.operation_uuid) ids.add(item.operation_uuid);
      }
    }
    return ids;
  }, [undoable, sessionDeliveries]);

  /**
   * Lo que sigue a la vista en la cola: lo que falta por entregar MÁS lo que se acaba de
   * marcar en esta sesión. Sin lo segundo, marcar una fila la hace desaparecer y con ella su
   * botón de deshacer justo cuando hace falta — que es el segundo siguiente.
   */
  const pending = useMemo(
    () => operations.filter((op) => isPendingOperation(op) || undoableIds.has(op.uuid)),
    [operations, undoableIds],
  );

  /** La cola de trabajo: de la más vieja a la más nueva, que es el orden en que se reparte. */
  const rows = useMemo(() => {
    return [...pending].sort((a, b) => {
      const left = pendingSince(a);
      const right = pendingSince(b);
      if (!left) return right ? 1 : 0;
      if (!right) return -1;
      return new Date(left).getTime() - new Date(right).getTime();
    });
  }, [pending]);

  const entries = useMemo(() => pendingByPair(rows), [rows]);
  const totals = useMemo(() => pendingTotals(entries), [entries]);

  /**
   * Las que sí se pueden marcar: ni las trabadas por falta de datos, ni las que ya se
   * marcaron en esta sesión y sólo siguen ahí para poder deshacerlas.
   */
  const selectable = useMemo(
    () => rows.filter((op) => isPendingOperation(op) && blockedReason(op) === null),
    [rows],
  );

  const selectedRows = useMemo(
    () => selectable.filter((op) => selected.has(op.uuid)),
    [selectable, selected],
  );

  const selectedEntries = useMemo(
    () => pendingByPair(selectedRows),
    [selectedRows],
  );
  const selectedTotals = useMemo(() => pendingTotals(selectedEntries), [selectedEntries]);

  /** Lo que quedaría debiéndose si se marcara lo seleccionado, por moneda. */
  const remainingEntries = useMemo(
    () => pendingByPair(rows.filter((op) => !selected.has(op.uuid))),
    [rows, selected],
  );

  /** Las trabadas por falta de datos: no reciben reparto, pero se siguen debiendo. */
  const blocked = useMemo(
    () =>
      new Set(
        rows
          .filter((op) => !isPendingOperation(op) || blockedReason(op) !== null)
          .map((op) => op.uuid),
      ),
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
    () =>
      distributeCurrency
        ? rows.filter((op) => isPendingOperation(op) && valueCurrency(op) === distributeCurrency)
        : [],
    [rows, distributeCurrency],
  );

  /** Las que de verdad pueden recibir reparto: de la moneda elegida y sin datos que falten. */
  const splittable = useMemo(
    () => distributableRows.filter((op) => !blocked.has(op.uuid)),
    [distributableRows, blocked],
  );

  const target = round2(toNumber(amount));

  /** Lo colocado hasta ahora, y lo que falta por colocar para poder confirmar. */
  const assigned = round2(
    splittable.reduce((sum, op) => sum + Math.max(0, toNumber(allocations[op.uuid] ?? '')), 0),
  );
  const unassigned = round2(target - assigned);

  /**
   * No se confirma un reparto a medias. La cifra del paso 1 es lo que el cliente entregó de
   * verdad: dejar parte sin colocar no es «repartir menos», es perder de vista dinero que ya
   * está en la caja. Por eso el botón sólo se enciende cuando lo colocado cuadra al céntimo.
   */
  const balanced = Math.abs(unassigned) < EPSILON && assigned > EPSILON;

  /** Lo que se enviaría: sólo las que reciben algo. */
  const splitRows = useMemo(
    () =>
      splittable
        .map((op) => ({ op, amount: round2(toNumber(allocations[op.uuid] ?? '')) }))
        .filter((row) => row.amount > EPSILON),
    [splittable, allocations],
  );

  const toggle = useCallback((uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }, []);

  /**
   * Pasa al paso 2 sembrando la propuesta: de la más vieja a la más nueva hasta donde
   * alcance. Es por donde el operador empezaría a mano, así que el caso normal es aceptar y
   * confirmar; editar es para el caso raro.
   */
  const goToSplit = useCallback(() => {
    const seed = distribute(
      toNumber(amount),
      splittable.map((op) => ({
        uuid: op.uuid,
        pending: op.pending_amount ?? 0,
        since: pendingSince(op),
      })),
    );
    const next: Record<string, string> = {};
    for (const row of seed.rows) {
      if (row.applied > EPSILON) next[row.uuid] = formatAmountForInput(row.applied);
    }
    setAllocations(next);
    setStep('split');
  }, [amount, splittable]);

  const backToAmount = useCallback(() => setStep('amount'), []);

  /** Lo que el operador escribe en la fila, tal cual: validar mientras teclea es pelearse. */
  const setAllocation = useCallback((uuid: string, text: string) => {
    setAllocations((prev) => ({ ...prev, [uuid]: text }));
  }, []);

  /**
   * La casilla de la fila: quitarla libera su dinero, ponerla se lleva lo que quede sin
   * colocar (sin pasarse de lo que esa operación debe).
   */
  const toggleAllocation = useCallback(
    (uuid: string) => {
      setAllocations((prev) => {
        const current = round2(toNumber(prev[uuid] ?? ''));
        if (current > EPSILON) {
          const next = { ...prev };
          delete next[uuid];
          return next;
        }
        const op = splittable.find((row) => row.uuid === uuid);
        if (!op) return prev;
        const placed = splittable.reduce(
          (sum, row) => sum + Math.max(0, toNumber(prev[row.uuid] ?? '')),
          0,
        );
        const free = round2(toNumber(amount) - placed);
        const give = Math.min(op.pending_amount ?? 0, Math.max(0, free));
        if (give <= EPSILON) return prev;
        return { ...prev, [uuid]: formatAmountForInput(round2(give)) };
      });
    },
    [splittable, amount],
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(selectable.map((op) => op.uuid)));
  }, [selectable]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  /**
   * Manda un lote y lo pone arriba del todo si entró.
   *
   * El lote es atómico en el servidor, así que aquí no hay «unas sí y otras no» que
   * reportar: o se marcó entero o no se marcó nada, y el error que vuelve es el motivo.
   */
  const deliver = useCallback(
    async (items: PendingDeliveryInput[]): Promise<boolean> => {
      if (items.length === 0) return false;
      setWorking(true);
      const result = await clientService.deliverPending(clientUuid, items);
      setWorking(false);

      if (!result.success || !result.data) {
        toast.error(result.error || 'No se pudo marcar la entrega');
        return false;
      }

      const delivery = result.data;
      setUndoable((prev) => [delivery, ...prev]);
      setSessionDeliveries((prev) => new Set(prev).add(delivery.uuid));
      // «Saldada» y no «entregada»: en un par de efectivo lo que se salda es lo que el
      // cliente nos debía, y decir «entregada» ahí es decir lo contrario de lo que pasó.
      toast.success(
        `${delivery.operations} ${delivery.operations === 1 ? 'operación saldada' : 'operaciones saldadas'}`,
      );
      onChanged();
      return true;
    },
    [clientUuid, onChanged],
  );

  const markSelected = useCallback(async () => {
    if (selectedRows.length === 0) return;
    const ok = await deliver(selectedRows.map((op) => ({ operation_uuid: op.uuid })));
    if (ok) setSelected(new Set());
  }, [selectedRows, deliver]);

  /**
   * Marca UNA operación, entera, desde su fila.
   *
   * Es el camino corto del efectivo: ahí no hay comprobante que atar, así que obligar a
   * seleccionar y bajar a la barra para saldar una sola fila es un rodeo. Sin monto: cubre
   * todo lo que le falte, que es lo que significa el botón.
   *
   * **Pregunta antes.** Es un clic suelto que mueve dinero en los libros y que en la barra
   * de selección exige dos pasos; sin diálogo, el botón está a un resbalón del ratón de la
   * fila de al lado. El diálogo dice MONTO y FECHA —que es por lo que se distinguen dos
   * filas del mismo cliente— y que se puede deshacer, para que la pregunta no dé más miedo
   * del que merece. El beneficiario no: no es lo que se comprueba antes de decir que sí, y
   * en un par de efectivo el que paga es el cliente, no él.
   */
  const markOne = useCallback(
    async (operationUuid: string): Promise<boolean> => {
      const op = rows.find((row) => row.uuid === operationUuid);
      if (!op) return false;

      const cash = op.settles_in_cash;
      const amount = formatPending(op.pending_amount ?? 0, valueCurrency(op));
      const when = formatCaracasShortDateTime(pendingSince(op));

      const ok = await confirm({
        title: cash ? '¿Ya pagó esta operación?' : '¿Darla por entregada?',
        description: cash
          ? `Se da por cobrado el efectivo de ${amount}, del ${when}. Queda registrado con tu nombre y se puede deshacer.`
          : `Se da por entregada ${amount}, del ${when}, sin comprobante que la respalde. Queda registrado con tu nombre y se puede deshacer.`,
        confirmText: cash ? 'Sí, ya pagó' : 'Sí, entregada',
        cancelText: 'Todavía no',
      });
      if (!ok) return false;

      return deliver([{ operation_uuid: operationUuid }]);
    },
    [rows, confirm, deliver],
  );

  /**
   * Deshace un lote entero.
   *
   * Cuando se llega desde la fila de UNA operación y el lote lleva más, se pregunta con el
   * número delante: deshacer calladamente tres entregas porque el operador quiso revertir
   * una sería el error que esta pantalla existe para evitar.
   */
  const undoDelivery = useCallback(
    async (delivery: PendingDelivery, fromOperation = false) => {
      if (fromOperation && delivery.operations > 1) {
        const ok = await confirm({
          title: '¿Deshacer las demás también?',
          description: `Esta operación se marcó junto a ${delivery.operations - 1} más, en un solo lote de ${formatPending(delivery.amount, delivery.items[0]?.currency ?? null)}. Deshacer devuelve las ${delivery.operations} a pendiente; no se puede deshacer sólo una.`,
          confirmText: `Deshacer las ${delivery.operations}`,
          cancelText: 'Dejarlo como está',
        });
        if (!ok) return;
      }

      setWorking(true);
      const result = await clientService.undoPendingDelivery(clientUuid, delivery.uuid);
      setWorking(false);

      if (!result.success) {
        toast.error(result.error || 'No se pudo deshacer la entrega');
        return;
      }

      setUndoable((prev) => prev.filter((item) => item.uuid !== delivery.uuid));
      toast.success(
        delivery.operations === 1
          ? 'Entrega deshecha: la operación vuelve a pendiente'
          : `Entrega deshecha: ${delivery.operations} operaciones vuelven a pendiente`,
      );
      onChanged();
    },
    [clientUuid, confirm, onChanged],
  );

  const undoOne = useCallback(
    async (operationUuid: string) => {
      const delivery = deliveryByOperation.get(operationUuid);
      if (delivery) await undoDelivery(delivery, true);
    },
    [deliveryByOperation, undoDelivery],
  );

  /**
   * Aplica el reparto que el operador está viendo.
   *
   * No se llega aquí sin que lo colocado cuadre con lo escrito —el botón está apagado hasta
   * entonces—, así que lo que se manda es exactamente lo que se vio.
   */
  const applyDistribution = useCallback(async () => {
    if (!balanced) return;
    const ok = await deliver(
      splitRows.map((row) => ({ operation_uuid: row.op.uuid, amount: row.amount })),
    );
    if (!ok) return;

    setAmount('');
    setAllocations({});
    setStep('amount');
    setMode('select');
  }, [balanced, splitRows, deliver]);

  return {
    state: {
      rows,
      entries,
      totals,
      remainingEntries,
      distributeCurrency,
      distributableRows,
      splittable,
      step,
      allocations,
      target,
      assigned,
      unassigned,
      balanced,
      splitRows,
      mode,
      selected,
      selectedRows,
      selectedTotals,
      selectedEntries,
      selectable,
      amount,
      working,
      undoable,
      deliveryByOperation,
    },
    actions: {
      setMode,
      toggle,
      selectAll,
      clearSelection,
      setAmount,
      goToSplit,
      backToAmount,
      setAllocation,
      toggleAllocation,
      markSelected,
      markOne,
      undoOne,
      undoDelivery,
      applyDistribution,
    },
  };
}
