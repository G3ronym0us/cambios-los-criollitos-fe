'use client';

import { useEffect, type RefObject } from 'react';

/** Cierra un popover al hacer click fuera del contenedor o al presionar Escape. */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!active) return;

    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, active, onClose]);
}
