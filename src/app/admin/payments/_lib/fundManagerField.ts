import type { FundGroup, FundGroupMemberFlat } from '@/types/fund';

/**
 * ZELLE/PAYPAL son métodos de pago en USD: para elegir fondo se liquidan como USD, igual que
 * ya hacía `CreateOperationForm` antes de que este filtro se extrajera de ahí.
 */
export function settleCurrency(currency: string | null | undefined): string {
  const upper = (currency || '').toUpperCase();
  return upper === 'ZELLE' || upper === 'PAYPAL' ? 'USD' : upper;
}

/** El fondo liquida en la moneda de origen o la de destino del par elegido. */
export function matchesPairCurrency(group: FundGroup, fromCur: string, toCur: string): boolean {
  if (!group.currency) return false;
  const settled = settleCurrency(group.currency);
  return settled === settleCurrency(fromCur) || settled === settleCurrency(toCur);
}

export interface FundOptions {
  /** Los que el par sugiere: liquidan en su moneda, más el del pago y el ya elegido. */
  suggested: FundGroup[];
  /** El resto de los fondos activos. Elegibles igual — el par no los sugiere, no los prohíbe. */
  others: FundGroup[];
}

/**
 * Reparte los fondos activos en los que el par sugiere y todos los demás.
 *
 * El sugerido es el que liquida en la moneda de origen o de destino del par, más dos que se
 * quedan arriba aunque no casen: el que el pago ya traía (`paymentFundGroupUuid` — ej. el
 * comprobante llegó por «Efectivo Caracas», en COP, y el par es USD/VES) y el que ya está
 * elegido, para que el campo nunca se vea vacío con un valor puesto. El del pago va primero.
 *
 * `others` NO se descarta: antes el campo solo ofrecía los sugeridos, así que con un único
 * fondo candidato «Cambiar» no tenía nada que ofrecer y se quedaba en quitar y poner el mismo.
 */
export function splitFundOptions(
  groups: FundGroup[],
  fromCur: string,
  toCur: string,
  paymentFundGroupUuid?: string | null,
  selectedGroupUuid?: string | null,
): FundOptions {
  const suggested: FundGroup[] = [];
  const others: FundGroup[] = [];
  for (const g of groups) {
    const pinned =
      (!!paymentFundGroupUuid && g.uuid === paymentFundGroupUuid) ||
      (!!selectedGroupUuid && g.uuid === selectedGroupUuid);
    if (pinned || matchesPairCurrency(g, fromCur, toCur)) suggested.push(g);
    else others.push(g);
  }
  const fromPayment = suggested.findIndex((g) => g.uuid === paymentFundGroupUuid);
  if (fromPayment > 0) suggested.unshift(suggested.splice(fromPayment, 1)[0]);
  return { suggested, others };
}

/** Gestor por defecto de un fondo: el marcado `is_fund_manager`, o el primero si no hay ninguno. */
export function defaultManagerFor(group: FundGroup | undefined): FundGroupMemberFlat | undefined {
  const members = group?.members ?? [];
  return members.find((m) => m.is_fund_manager) ?? members[0];
}

/** El gestor elegido no es el del fondo: alguien más lo movió (caso real, no un error). */
export function isManagerOverridden(group: FundGroup | undefined, managerUuid: string): boolean {
  if (!managerUuid) return false;
  const def = defaultManagerFor(group);
  return !!def && def.user_uuid !== managerUuid;
}

/** Este fondo es el mismo donde ya se contabilizó el comprobante que originó la cotización. */
export function isFundFromPayment(
  groupUuid: string,
  paymentFundGroupUuid: string | null | undefined,
): boolean {
  return !!groupUuid && groupUuid === paymentFundGroupUuid;
}

export type FundFieldMode = 'chips' | 'field';

/**
 * Regla de conmutación del diseño, sobre los fondos SUGERIDOS: con 2 o 3 caben como chips en
 * el propio formulario — abrir un paso del cajón sería de más. Con uno solo o con cuatro o
 * más, el campo cerrado (que abre el paso) explica mejor la decisión. En los dos casos el
 * resto de los fondos sigue a un clic: los chips llevan «Otros fondos» y el campo, el paso.
 */
export function fundFieldMode(suggestedCount: number): FundFieldMode {
  return suggestedCount >= 2 && suggestedCount <= 3 ? 'chips' : 'field';
}

/**
 * Insignia de dos letras para el avatar del fondo. Si el nombre ya termina en un código de
 * dos letras («Criollitos VE») se usa tal cual — así se nombran los fondos regionales —; si
 * no, se toman las iniciales de las dos primeras palabras («Efectivo Caracas» → EC). Con una
 * sola palabra, sus dos primeras letras.
 */
export function fundBadge(name: string | null | undefined): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return (words[0] + '??').slice(0, 2).toUpperCase();
  const last = words[words.length - 1];
  if (/^[a-záéíóúñ]{2}$/i.test(last)) return last.toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Iniciales de una persona para su avatar: primera letra del nombre y del apellido. */
export function personInitials(name: string | null | undefined): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return (words[0] + '??').slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Filtro del buscador cuando el paso lista más de ocho fondos: por nombre, sin mayúsculas. */
export function filterFundCandidates(candidates: FundGroup[], query: string): FundGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return candidates;
  return candidates.filter((g) => g.name.toLowerCase().includes(q));
}
