'use client';

import { useEffect, useState } from 'react';

/**
 * `true` cuando el viewport está por debajo del breakpoint indicado (default: `sm` = 640px).
 * Sirve para elegir presentaciones distintas (popover anclado en desktop vs bottom sheet en mobile).
 */
export function useIsMobile(breakpointPx = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 0.02}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [breakpointPx]);

  return isMobile;
}
