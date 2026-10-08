'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { paymentService } from '@/services/paymentService';
import { useConfirm } from '@/hooks/useConfirm';
import type { PaymentData, PaymentTable } from '@/types/payment';
import { canMarkIrrelevant, runInBatches } from '../_lib/bulkIrrelevant';

/**
 * Selección múltiple de la bandeja de pagos y lo único que hace en lote: marcar como
 * irrelevantes.
 *
 * La selección es de la pestaña visible: cambiar de entrantes a salientes la vacía (son
 * tablas distintas y los `id` chocan entre ellas). Sólo se puede seleccionar lo que pasa
 * `canMarkIrrelevant`.
 */
export function usePaymentSelection(
  table: PaymentTable,
  payments: PaymentData[],
  onDone: () => void,
) {
  const confirm = useConfirm();
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [description, setDescription] = useState('');
  const [working, setWorking] = useState(false);
  const [lastTable, setLastTable] = useState(table);

  if (lastTable !== table) {
    setLastTable(table);
    setActive(false);
    setSelected(new Set());
  }

  const selectable = useMemo(() => payments.filter(canMarkIrrelevant), [payments]);
  const selectableIds = useMemo(() => new Set(selectable.map((p) => p.id)), [selectable]);
  // Lo seleccionado que sigue a la vista y seleccionable: tras un refresco, lo que ya se
  // marcó deja de serlo y sale solo de la cuenta.
  const selectedIds = useMemo(
    () => [...selected].filter((id) => selectableIds.has(id)),
    [selected, selectableIds],
  );

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = selectable.length > 0 && selectedIds.length === selectable.length;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(selectable.map((p) => p.id)));
  }, [allSelected, selectable]);

  const start = useCallback(() => setActive(true), []);

  const cancel = useCallback(() => {
    setActive(false);
    setSelected(new Set());
    setDescription('');
  }, []);

  const markIrrelevant = useCallback(async () => {
    const ids = selectedIds;
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `¿Marcar ${ids.length} ${ids.length === 1 ? 'pago' : 'pagos'} como irrelevantes?`,
      description:
        table === 'incoming'
          ? 'Dejan de pedir atención y se sueltan de su operación. La marca se puede quitar después, pago a pago.'
          : 'Quedan como dinero que salió por algo que no es un cambio y se sueltan de su operación. La marca se puede quitar después, pago a pago.',
      confirmText: 'Sí, marcarlos',
      cancelText: 'Todavía no',
    });
    if (!ok) return;

    setWorking(true);
    const note = description.trim() || null;
    const { done, failed } = await runInBatches(ids, (id) =>
      paymentService.markIrrelevant(table, id, true, note),
    );
    setWorking(false);

    if (done.length > 0) {
      toast.success(
        done.length === 1
          ? '1 pago marcado como irrelevante'
          : `${done.length} pagos marcados como irrelevantes`,
      );
    }
    if (failed.length > 0) {
      // Los que fallaron se quedan seleccionados: lo normal es abrirlos uno a uno.
      toast.error(`${failed.length} no se ${failed.length === 1 ? 'pudo' : 'pudieron'} marcar`, {
        description: failed
          .slice(0, 3)
          .map((f) => `#${f.id}: ${f.error}`)
          .join(' · '),
      });
      setSelected(new Set(failed.map((f) => f.id)));
    } else {
      cancel();
    }
    onDone();
  }, [selectedIds, confirm, table, description, cancel, onDone]);

  return {
    state: {
      active,
      selected,
      selectedCount: selectedIds.length,
      selectableIds,
      allSelected,
      someSelected: selectedIds.length > 0 && !allSelected,
      selectableCount: selectable.length,
      description,
      working,
    },
    actions: { start, cancel, toggle, toggleAll, setDescription, markIrrelevant },
  };
}
