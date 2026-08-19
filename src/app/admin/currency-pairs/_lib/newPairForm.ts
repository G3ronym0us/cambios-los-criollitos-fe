import type { CurrencyPairData } from '@/types/admin';

/**
 * Reglas del alta de un par, sin React de por medio para poder probarlas.
 */

/**
 * Qué falta para poder crear el par, en una frase — o `null` si ya se puede.
 *
 * El orden de las comprobaciones es el orden en que se rellena el formulario, porque el
 * mensaje vive junto al botón del pie: quien llega ahí quiere saber qué le falta, no un
 * inventario de todo lo que está mal.
 *
 * Ojo con lo que NO valida: que las dos monedas sean iguales es legítimo. Un par
 * `USDT/USDT` es una paridad 1:1, que es justo lo que hace falta para colgarle un par de
 * método de pago con un porcentaje (`ZELLE-USDT` = `USDT-USDT` −7 %). El backend lo acepta
 * —no hay validación de monedas iguales y el unique es sobre el par— y bloquearlo aquí
 * dejaba esa configuración sin forma de crearse desde el panel.
 */
export function describeMissingField(values: {
  fromUuid: string;
  toUuid: string;
  description: string | null | undefined;
}): string | null {
  if (!values.fromUuid) return 'Falta la moneda de origen';
  if (!values.toUuid) return 'Falta la moneda de destino';
  if (!values.description?.trim()) return 'Falta la descripción';
  return null;
}

/**
 * Monedas que un lado del par NO puede tomar porque el par resultante ya existe.
 *
 * Devuelve `uuid de moneda → nombre del par que la ocupa`, para poder apagar la opción
 * diciendo cuál es ese par, en vez de dejar que el operador guarde y se lo rechace el
 * unique del backend con un error que no explica nada.
 */
export function takenCurrencies(
  pairs: CurrencyPairData[],
  otherCurrencyUuid: string,
  side: 'from' | 'to',
): Map<string, string> {
  const taken = new Map<string, string>();
  if (!otherCurrencyUuid) return taken;
  for (const pair of pairs) {
    if (side === 'from' && pair.to_currency_uuid === otherCurrencyUuid) {
      taken.set(pair.from_currency_uuid, pair.display_name);
    } else if (side === 'to' && pair.from_currency_uuid === otherCurrencyUuid) {
      taken.set(pair.to_currency_uuid, pair.display_name);
    }
  }
  return taken;
}
