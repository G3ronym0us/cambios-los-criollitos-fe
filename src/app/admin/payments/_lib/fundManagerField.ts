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

/**
 * Fondos que puede elegir esta cotización: los que liquidan en la moneda del par, más el que
 * el pago ya traía aunque no case (`keepUuid`) — si no, el campo se vería vacío con un valor
 * puesto (ej. el comprobante llegó por «Efectivo Caracas», en COP, y el par es USD/VES).
 */
export function fundCandidatesForPair(
  groups: FundGroup[],
  fromCur: string,
  toCur: string,
  keepUuid?: string | null,
): FundGroup[] {
  return groups.filter((g) => g.uuid === keepUuid || matchesPairCurrency(g, fromCur, toCur));
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
 * Regla de conmutación del diseño: con 2 o 3 fondos candidatos caben como chips en el propio
 * formulario — abrir un paso del cajón sería de más. Con uno solo o con cuatro o más, el
 * campo cerrado (que abre el paso cuando hace falta elegir) explica mejor la decisión.
 */
export function fundFieldMode(candidateCount: number): FundFieldMode {
  return candidateCount >= 2 && candidateCount <= 3 ? 'chips' : 'field';
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

/** Filtro del buscador cuando hay más de ocho fondos candidatos: por nombre, sin mayúsculas. */
export function filterFundCandidates(candidates: FundGroup[], query: string): FundGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return candidates;
  return candidates.filter((g) => g.name.toLowerCase().includes(q));
}
