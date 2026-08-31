// Transferir un pago a otro cliente: las reglas, en un solo sitio.
//
// El caso: el comprobante entra a nombre de quien lo mandó, pero el dinero es de otro (el
// esposo pagó por la esposa, la empresa por el empleado, el bot lo pegó al cliente
// equivocado). Hasta ahora la salida era anular y volver a cargar, y se perdía el hilo.
//
// La regla que gobierna todo lo de abajo: el pago NUNCA se duplica ni se anula — es el mismo
// comprobante con otro dueño. De ahí se sigue que no se puede transferir nada que ya haya
// movido caja, porque mudarlo dejaría el movimiento a nombre del cliente equivocado.

import { Role } from '@/utils/enums';
import type { PaymentData, PaymentTransferReason } from '@/types/payment';

/** Los motivos, en el orden en que se ofrecen: el más frecuente primero. */
export const TRANSFER_REASONS: { value: PaymentTransferReason; label: string }[] = [
  { value: 'THIRD_PARTY', label: 'Pagó un tercero' },
  { value: 'BOT_MISMATCH', label: 'Mal asignado por el bot' },
  { value: 'DUPLICATE_CLIENT', label: 'Cliente duplicado' },
];

const REASON_LABELS: Record<PaymentTransferReason, string> = Object.fromEntries(
  TRANSFER_REASONS.map((r) => [r.value, r.label]),
) as Record<PaymentTransferReason, string>;

export function transferReasonLabel(reason: PaymentTransferReason | null | undefined): string {
  return reason ? (REASON_LABELS[reason] ?? reason) : 'sin motivo';
}

/**
 * Quién puede transferir.
 *
 * El diseño lo llamó `pagos.transferir`, pero la app no tiene permisos finos: tiene roles, y
 * `/admin` entero ya exige MODERATOR o ROOT. Colgarlo de MODERATOR sería no gatearlo, así que
 * queda en ROOT — mover plata de un perfil a otro es de la misma familia que las acciones que
 * `useFundsResources` ya reserva a ROOT. Si mañana el backend expone permisos de verdad, este
 * es el único sitio que hay que tocar.
 */
export function canTransferPayments(role: Role | null | undefined): boolean {
  return role === Role.ROOT;
}

export type TransferBlock =
  | { allowed: true }
  | { allowed: false; reason: string };

// Por debajo de esto un importe se considera cero (mismo umbral que el resto de la pantalla).
const EPSILON = 0.01;

/**
 * Si este comprobante concreto se puede mudar de cliente, y si no, por qué no.
 *
 * El texto del `reason` es el que se pinta bajo la fila deshabilitada: se devuelve desde aquí
 * para que la explicación y la condición que la produce no se puedan desincronizar.
 */
export function canTransferPayment(p: PaymentData): TransferBlock {
  // 1. Conciliado: la operación se entregó y se cerró. Ese dinero ya salió en los reportes
  //    del día; mudarlo ahora los reescribiría hacia atrás.
  if (p.operation_status === 'COMPLETED') {
    return {
      allowed: false,
      reason: 'La operación ya se entregó y se cerró — el pago está conciliado.',
    };
  }
  // 2. El comprobante ya está contado dentro de un fondo, a nombre de un gestor. La
  //    transferencia no deshace el depósito, así que quedaría a nombre de quien no es.
  if (p.fund_deposit?.status === 'CONFIRMED') {
    return {
      allowed: false,
      reason: 'El comprobante ya se confirmó como depósito al fondo.',
    };
  }
  // 3. Ya se acreditó como saldo a favor: el abono vive en el ledger del cliente de origen.
  if ((p.credited_to_balance ?? 0) > EPSILON) {
    return {
      allowed: false,
      reason: 'Parte del pago ya se acreditó al saldo a favor del cliente.',
    };
  }
  return { allowed: true };
}

/**
 * De qué operación se va a desvincular el pago al transferirlo, si es que hay alguna.
 *
 * La transferencia nunca mueve la operación de cliente por su cuenta: la deja sin comprobante
 * y esperando fondos. Por eso el aviso se muestra ANTES de confirmar y no como un diálogo
 * después — no hay nada que decidir, solo algo que saber.
 */
export function transferUnlinksOperation(p: PaymentData): boolean {
  return !!p.operation_uuid;
}

/** Si falta algo para poder confirmar, qué es. `null` = listo para enviar. */
export function transferBlockingField(
  destinationUuid: string | null,
  reason: PaymentTransferReason | null,
): 'destination' | 'reason' | null {
  if (!destinationUuid) return 'destination';
  if (!reason) return 'reason';
  return null;
}

/**
 * Pista para el buscador de destino: los apellidos que comparte un candidato con el cliente
 * actual. El caso más común de la pantalla es un pago entre familiares, y reconocerlo a ojo
 * en una lista de homónimos es justo lo que hace que se elija el cliente equivocado.
 *
 * Se compara solo la última palabra de cada nombre (el primer apellido en la práctica), sin
 * tildes ni mayúsculas, y se ignoran las partículas y los nombres de una sola palabra.
 */
const NAME_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'van', 'von']);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function surnameOf(name: string | null | undefined): string | null {
  const words = normalize(name || '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !NAME_PARTICLES.has(w));
  if (words.length < 2) return null; // un solo nombre no tiene apellido que comparar
  return words[words.length - 1];
}

export function sharesSurname(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const sa = surnameOf(a);
  const sb = surnameOf(b);
  return sa != null && sa === sb;
}
