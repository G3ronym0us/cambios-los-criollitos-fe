'use client';

import { useState } from 'react';

/**
 * Paginado en el cliente de una lista que ya está entera en memoria.
 *
 * `resetKey` es lo que, al cambiar, devuelve a la página 1 (un filtro, un par): saltar de
 * filtro y aterrizar en la página 4 del nuevo es perderse. Lo demás NO resetea — marcar una
 * fila y que recargue la lista no debe mandarte arriba —, sólo se recorta la página si la
 * lista se encogió por debajo de ella.
 */
export function usePagedList<T>(items: T[], pageSize: number, resetKey: string = '') {
  const [page, setPage] = useState(1);
  const [lastKey, setLastKey] = useState(resetKey);

  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    page: current,
    totalPages,
    total: items.length,
    setPage,
  };
}
