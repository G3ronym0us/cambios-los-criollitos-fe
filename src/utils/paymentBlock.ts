// Datos de pago predeterminados del cliente: helpers para construir un bloque
// candidato a partir de los campos de un pago y para compararlo con el guardado.
//
// El bloque es texto libre (banco/cédula/teléfono, cuenta, o llave Pix). El bot lo
// re-normaliza al inyectarlo en una cotización sin datos, así que no necesita estar
// en forma canónica exacta — basta con ser legible y editable por el operador.

import type { PaymentData } from '@/types/payment';

// Monedas fiat en las que un cliente puede recibir (donde aplican los datos por defecto).
export const DEFAULT_PAYMENT_CURRENCIES = ['VES', 'BRL', 'COP'] as const;
export type DefaultPaymentCurrency = (typeof DEFAULT_PAYMENT_CURRENCIES)[number];

/** true si el pago trae algún dato bancario identificable para guardar. */
export function hasPaymentData(p: PaymentData): boolean {
  return !!(p.account_number || p.phone_to || p.identification || p.bank_to || p.bank_from);
}

/**
 * Bloque candidato a partir de los campos estructurados del pago.
 * - Transferencia: cuenta + cédula.
 * - Pago móvil: banco + cédula + teléfono.
 * Devuelve null si no hay datos suficientes.
 */
export function buildPaymentBlock(p: PaymentData): string | null {
  const bank = p.bank_to ?? p.bank_from ?? null;
  const lines: string[] = [];
  if (p.account_number) lines.push(p.account_number);
  else if (bank) lines.push(bank);
  if (p.identification) lines.push(p.identification);
  if (p.phone_to) lines.push(p.phone_to);
  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * true si el bloque alcanza para cobrar: una cuenta de 20 dígitos se basta sola,
 * pero un banco suelto no — hace falta al menos otro dato (cédula o teléfono).
 * Guardar "0102" como cuenta del cliente haría que el bot inyecte datos inservibles.
 */
export function isCompleteAccount(p: PaymentData): boolean {
  if (p.account_number) return true;
  const block = buildPaymentBlock(p);
  return !!block && block.split('\n').length >= 2;
}

/**
 * true si este pago puede servir de cuenta de cobro predeterminada: datos
 * suficientes y en una fiat soportada. Sin el filtro de moneda se ofrecería
 * guardar cosas como un correo de Zelle, que el bot nunca podría inyectar (su
 * guard exige que la moneda guardada sea la que el cliente recibe).
 */
export function canBeDefaultAccount(p: PaymentData): boolean {
  return isCompleteAccount(p) && suggestedCurrency(p) !== '';
}

/** Moneda fiat sugerida para el pago, si es una de las soportadas. */
export function suggestedCurrency(p: PaymentData): DefaultPaymentCurrency | '' {
  const c = (p.currency ?? '').toUpperCase();
  return (DEFAULT_PAYMENT_CURRENCIES as readonly string[]).includes(c)
    ? (c as DefaultPaymentCurrency)
    : '';
}

/** Normaliza un bloque para comparar igualdad (ignora mayúsculas y espacios). */
export function normalizeBlockForCompare(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .split('\n')
    .map((line) => line.replace(/\s+/g, '').toUpperCase())
    .filter(Boolean)
    .join('\n');
}

/** true si dos bloques representan los mismos datos. */
export function sameBlock(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeBlockForCompare(a) === normalizeBlockForCompare(b);
}
