import type { AmountSide } from '@/utils/rounding';

/**
 * Montos redondos para el lado libre de una cotización.
 *
 * El lado del comprobante no se toca: ese dinero ya se movió. Redondear el otro
 * lado no lo cambia — cambia la *tasa implícita* del trato. Por eso cada opción
 * no dice solo «105,00»: dice a qué tasa queda y con qué margen, que es lo único
 * que la decisión cambia de verdad.
 *
 * El múltiplo no se elige aquí: es una propiedad del par (`negotiation_step`),
 * se pone una vez en su pestaña de Redondeo y el cajón solo lo usa.
 */

export interface RoundOption {
  /** El monto redondo para el lado libre. */
  amount: number;
  /** La tasa que resulta de dejar el ancla quieta y mover el lado libre a `amount`. */
  rate: number;
  /** El margen que quedaría, con la misma fórmula que `rawMargin` del formulario. */
  margin: number;
  /**
   * Si el backend registrará ese margen. `implied_margin` solo acepta lo que
   * parece un margen comercial: el 0 exacto sí, pero un negativo o un ≥99 % los
   * descarta y la operación nace sin margen deducido.
   */
  registers: boolean;
  /** El que se ofrece primero: el más cercano que no empeora el margen actual. */
  recommended: boolean;
}

const EPS = 1e-9;

/** Si `value` ya es múltiplo de `step`, no hay nada que sugerir. */
export function isMultipleOf(value: number, step: number): boolean {
  if (!(step > 0)) return false;
  const rest = Math.abs(value / step - Math.round(value / step));
  return rest < 1e-7;
}

/**
 * La tasa (`to` por 1 de `from`) que resulta de fijar el lado libre en `freeAmount`
 * dejando el ancla quieta.
 *
 * `anchorSide` es el lado que trae el comprobante: con 'RECEIVE' el ancla es el
 * monto de destino y el libre el de origen, y con 'SEND' al revés.
 */
export function impliedRate(
  anchorAmount: number,
  freeAmount: number,
  anchorSide: AmountSide
): number | null {
  if (!(anchorAmount > 0) || !(freeAmount > 0)) return null;
  const rate = anchorSide === 'RECEIVE' ? anchorAmount / freeAmount : freeAmount / anchorAmount;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/** El mismo cálculo que `rawMargin`: la tasa aplicada contra la tasa base del par. */
export function marginOf(rate: number, baseEffectiveRate: number): number {
  return (1 - rate / baseEffectiveRate) * 100;
}

function registersMargin(margin: number): boolean {
  const rounded = Math.round(margin * 10000) / 10000;
  return rounded === 0 || (rounded > 0 && rounded < 99);
}

/**
 * Las dos opciones redondas que rodean al monto libre actual: la de abajo y la de
 * arriba. Se ordenan por margen descendente, así que la primera es la que más
 * conviene — nunca la que hace perder plata.
 *
 * Devuelve vacío cuando no hay nada que ofrecer: sin múltiplo, sin tasa base, o
 * con el monto libre ya redondo.
 */
export function roundOptions(params: {
  anchorAmount: number;
  freeAmount: number;
  anchorSide: AmountSide;
  step: number | null | undefined;
  baseEffectiveRate: number | null;
  /** El margen de lo que hay escrito ahora, para saber cuál no empeora. */
  currentMargin: number | null;
}): RoundOption[] {
  const { anchorAmount, freeAmount, anchorSide, step, baseEffectiveRate, currentMargin } = params;

  if (!step || step <= 0) return [];
  if (!baseEffectiveRate || baseEffectiveRate <= 0) return [];
  if (!(anchorAmount > 0) || !(freeAmount > 0)) return [];
  if (isMultipleOf(freeAmount, step)) return [];

  const candidates = [
    Math.floor(freeAmount / step + EPS) * step,
    Math.ceil(freeAmount / step - EPS) * step,
  ];

  const options: RoundOption[] = [];
  for (const amount of candidates) {
    // Un lado en cero no es una cotización; y el redondeo hacia abajo puede dar 0.
    if (!(amount > 0)) continue;
    if (options.some((o) => Math.abs(o.amount - amount) < EPS)) continue;
    const rate = impliedRate(anchorAmount, amount, anchorSide);
    if (rate == null) continue;
    const margin = Math.round(marginOf(rate, baseEffectiveRate) * 10000) / 10000;
    options.push({ amount, rate, margin, registers: registersMargin(margin), recommended: false });
  }

  options.sort((a, b) => b.margin - a.margin);

  // El recomendado es el mejor que NO empeora lo que ya hay. Si redondear solo
  // puede costar plata, no se recomienda ninguno: la opción sigue estando, pero
  // el operador la elige a sabiendas.
  const best = options[0];
  if (best && (currentMargin == null || best.margin >= currentMargin)) {
    best.recommended = true;
  }

  return options;
}
