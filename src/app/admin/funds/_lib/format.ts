/** Formatea un valor USDT con 2 decimales y separadores es-ES (usado en toda la sección Fondos). */
export function formatUSDT(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Paleta de acentos para avatares de grupo — determinista por nombre, coherente en light/dark. */
const AVATAR_CLASSES = [
  'bg-primary/10 text-primary',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
];

/** Clase de color de avatar estable a partir de un texto (nombre/uuid del grupo). */
export function avatarClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_CLASSES[Math.abs(hash) % AVATAR_CLASSES.length];
}

/** Inicial en mayúscula para avatares (fallback «?» si el texto viene vacío). */
export function initialOf(text: string | null | undefined): string {
  return (text?.trim().charAt(0) || '?').toUpperCase();
}
