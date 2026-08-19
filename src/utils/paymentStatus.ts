// Una sola insignia por comprobante.
//
// Antes cada fila podía acumular tres o cuatro badges (estado de la op + "sin asignar" +
// "reparto en N ops" + "reenvío"), y con eso la lista no se podía leer de un vistazo. Aquí
// se decide UNA: la que describe qué falta por hacer, o —si no falta nada— dónde acabó el
// dinero. El orden de los `if` ES la prioridad, de más urgente a más informativo.

import {
  AlertTriangle,
  Forward,
  HandCoins,
  Link2Off,
  PiggyBank,
  Split,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatNumber } from '@/utils/functions';
import { getStatusMeta } from '@/utils/operationStatus';
import type { PaymentData } from '@/types/payment';

export type PaymentTone = 'success' | 'warning' | 'destructive' | 'info' | 'neutral' | 'primary';

export interface PaymentStatusMeta {
  label: string;
  tone: PaymentTone;
  icon: LucideIcon;
  /** El comprobante espera una decisión: pinta la barra ámbar y entra en «Por atender». */
  attention: boolean;
  /** El badge de "sin vincular" va punteado, para que se lea como hueco y no como estado. */
  dashed?: boolean;
}

// Redondeos de OCR y de tasa: por debajo de esto un pago se considera cuadrado.
// Mismo umbral que `AMOUNT_EPSILON` en el backend.
const EPSILON = 0.01;

export function getPaymentStatusMeta(p: PaymentData, outgoing: boolean): PaymentStatusMeta {
  const unassigned = p.unassigned_amount ?? 0;
  const deposit = p.deposit ?? null;
  const loan = p.loan ?? null;

  // 1. Clasificaciones terminales del saliente: el operador ya dijo dónde acabó ese dinero.
  //    Van antes que «Revisar OCR» porque un comprobante descartado no espera ningún monto —
  //    si no, marcarlo irrelevante no lo sacaba nunca de «Por atender». Mismo orden que el
  //    `_attention_condition` del backend, para que la insignia y el filtro no se contradigan.
  if (outgoing && p.is_personal_expense) {
    return { label: 'Personal', tone: 'warning', icon: Tag, attention: false };
  }
  if (outgoing && p.is_irrelevant) {
    return { label: 'Irrelevante', tone: 'neutral', icon: Tag, attention: false };
  }
  if (loan) {
    return {
      label: loan.status === 'PAID' ? 'Préstamo pagado' : 'Préstamo',
      tone: loan.status === 'PAID' ? 'success' : 'warning',
      icon: HandCoins,
      attention: false,
    };
  }

  // 2. El OCR no leyó el monto: sin eso no se puede hacer nada más con el comprobante.
  if (p.amount == null) {
    return { label: 'Revisar OCR', tone: 'destructive', icon: AlertTriangle, attention: true };
  }

  // 3. Llegó más dinero del que respalda: hay que repartirlo o acreditarlo.
  if (!outgoing && unassigned > EPSILON) {
    return {
      label: `${formatNumber(unassigned)} sin asignar`,
      tone: 'warning',
      icon: Split,
      attention: true,
    };
  }

  // 4. Destinos que no son una operación.
  if (deposit) {
    return {
      label: `Depósito${deposit.method ? ` · ${deposit.method}` : ' · fondo'}`,
      tone: 'success',
      icon: PiggyBank,
      attention: false,
    };
  }
  if (!outgoing && !p.operation_uuid && (p.credited_to_balance ?? 0) > EPSILON) {
    return { label: 'Saldo a favor', tone: 'success', icon: Wallet, attention: false };
  }

  // 5. Un mismo comprobante cubriendo varios cambios.
  if (!outgoing && (p.allocations_count ?? 0) > 1) {
    return {
      label: `Repartido en ${p.allocations_count} ops`,
      tone: 'info',
      icon: Split,
      attention: false,
    };
  }

  // 6. Vinculado y cuadrado: manda el estado de su operación.
  if (p.operation_uuid) {
    const meta = getStatusMeta(p.operation_status);
    return { label: meta.label, tone: meta.tone, icon: meta.icon, attention: false };
  }

  // 7. Sin operación pero contabilizado en un grupo: ni op ni movimiento todavía.
  if (!outgoing && p.fund_group_name) {
    return {
      label: `${p.fund_group_name} · sin operación`,
      tone: 'warning',
      icon: Users,
      attention: true,
    };
  }

  return { label: 'Sin vincular', tone: 'neutral', icon: Link2Off, attention: true, dashed: true };
}

/** Insignia secundaria: solo el reenvío, que no compite con ninguna de las de arriba. */
export function getPaymentTag(p: PaymentData, outgoing: boolean) {
  if (outgoing && p.source_payment_id) {
    return { label: 'Reenvío', tone: 'info' as PaymentTone, icon: Forward };
  }
  return null;
}

/** Acción principal de la fila, derivada del mismo estado. */
export function getPaymentAction(
  p: PaymentData,
  outgoing: boolean,
): { label: string; variant: 'primary' | 'outline' | 'danger' } {
  const meta = getPaymentStatusMeta(p, outgoing);
  // Solo se ofrece corregir el OCR de lo que sigue esperando una decisión: un comprobante ya
  // clasificado no necesita monto, y ofrecerle «Corregir» lo hacía parecer pendiente.
  if (p.amount == null && meta.attention) return { label: 'Corregir', variant: 'danger' };
  if (!p.operation_uuid && !p.deposit && !p.loan && !p.is_personal_expense && !p.is_irrelevant) {
    return { label: 'Vincular', variant: 'outline' };
  }
  return { label: 'Gestionar', variant: meta.attention ? 'primary' : 'outline' };
}
