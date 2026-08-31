/**
 * Repartir un monto entregado entre las operaciones que le debemos al cliente.
 *
 * La regla: de la más vieja a la más nueva, que es el orden en que el cliente reclama.
 * El reparto es una PROPUESTA — se calcula entero antes de tocar nada y el operador lo ve
 * y lo confirma, así que esto es aritmética pura sin llamadas ni estado.
 */

export interface DistributableOperation {
  uuid: string;
  /** Lo que falta por entregar, en la moneda del valor del trato. */
  pending: number;
  /** Para ordenar por antigüedad; las que no la traen van al final. */
  since: string | null;
}

export type DistributionKind = 'full' | 'partial' | 'none';

export interface DistributionRow {
  uuid: string;
  kind: DistributionKind;
  /** Cuánto le toca de lo entregado. */
  applied: number;
  /** Lo que le seguiría faltando después de aplicarlo. */
  remaining: number;
}

export interface Distribution {
  rows: DistributionRow[];
  /** Lo que de verdad se coloca; puede ser menos que lo entregado. */
  applied: number;
  /** Lo entregado que no cabe en ninguna operación. */
  leftover: number;
  /** Lo que se le seguiría debiendo al cliente después del reparto. */
  outstanding: number;
  /** Cuántas operaciones toca el reparto: lo que dice el botón de confirmar. */
  touched: number;
}

/** Debajo de esto es ruido de redondeo, no dinero. */
const EPSILON = 0.01;

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function byAge(a: DistributableOperation, b: DistributableOperation): number {
  if (!a.since) return b.since ? 1 : 0;
  if (!b.since) return -1;
  return new Date(a.since).getTime() - new Date(b.since).getTime();
}

export interface DistributeOptions {
  /**
   * Con parciales apagado ninguna operación queda a medias: una que no cabe entera se
   * salta y el monto sigue buscando sitio en las siguientes (que son más nuevas, pero
   * pueden ser más pequeñas). Lo que no encuentre sitio queda como sobrante.
   */
  allowPartial?: boolean;
  /** Filas que el operador desmarcó del previo; el monto se reparte entre las que quedan. */
  excluded?: ReadonlySet<string>;
}

export function distribute(
  amount: number,
  operations: DistributableOperation[],
  { allowPartial = true, excluded }: DistributeOptions = {},
): Distribution {
  const ordered = [...operations].sort(byAge);
  const rows: DistributionRow[] = [];

  let remaining = Number.isFinite(amount) && amount > 0 ? amount : 0;
  let applied = 0;
  let outstanding = 0;
  let touched = 0;

  for (const operation of ordered) {
    const pending = operation.pending;
    const skipped = excluded?.has(operation.uuid) ?? false;

    if (skipped || remaining <= EPSILON) {
      rows.push({ uuid: operation.uuid, kind: 'none', applied: 0, remaining: round(pending) });
      outstanding += pending;
      continue;
    }

    if (remaining + EPSILON >= pending) {
      remaining -= pending;
      applied += pending;
      touched += 1;
      rows.push({ uuid: operation.uuid, kind: 'full', applied: round(pending), remaining: 0 });
      continue;
    }

    if (!allowPartial) {
      rows.push({ uuid: operation.uuid, kind: 'none', applied: 0, remaining: round(pending) });
      outstanding += pending;
      continue;
    }

    const part = remaining;
    remaining = 0;
    applied += part;
    touched += 1;
    outstanding += pending - part;
    rows.push({
      uuid: operation.uuid,
      kind: 'partial',
      applied: round(part),
      remaining: round(pending - part),
    });
  }

  return {
    rows,
    applied: round(applied),
    leftover: round(remaining),
    outstanding: round(outstanding),
    touched,
  };
}
