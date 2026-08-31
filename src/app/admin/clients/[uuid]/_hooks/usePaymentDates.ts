'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OperationData } from '@/types/operation';
import { isPendingOperation, type PaymentDates } from '../../_lib/pending';
import { loadPaymentDates } from '../../_lib/paymentDates';

/**
 * Resuelve desde cuándo espera de verdad cada operación sin cubrir.
 *
 * Vive aquí arriba, en la pestaña Cuenta, y no dentro del filtro «Por entregar», porque el
 * hilo y la cola de trabajo tienen que ordenar por lo MISMO: si no, una operación cambiaría
 * de sitio sólo por cambiar de filtro.
 *
 * Sólo se resuelven las operaciones sin cubrir: cuesta una petición por operación, y son
 * las únicas donde la fecha decide algo (el orden de la cola y, con él, a qué operación va
 * el dinero de un reparto). El histórico ya entregado se queda con la fecha de la operación.
 */
export function usePaymentDates(operations: OperationData[]): PaymentDates {
  const [dates, setDates] = useState<PaymentDates>(new Map());

  // La clave es el conjunto de uuids sin cubrir: cambia al marcar o deshacer algo, no en
  // cada render.
  const key = useMemo(
    () =>
      operations
        .filter(isPendingOperation)
        .map((op) => op.uuid)
        .sort()
        .join(','),
    [operations],
  );

  useEffect(() => {
    if (!key) {
      setDates(new Map());
      return;
    }
    let alive = true;
    loadPaymentDates(key.split(',')).then((resolved) => {
      if (alive) setDates(resolved);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return dates;
}
