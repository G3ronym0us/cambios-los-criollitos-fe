'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { paymentService } from '@/services/paymentService';
import { cn } from '@/lib/utils';
import { formatCaracasShortDateTime } from '@/utils/functions';
import type { PaymentData, PaymentTable, PaymentTimelineEntry } from '@/types/payment';
import { transferReasonLabel } from './paymentTransfer';

/** Motivo y nota, ya redactados: «Pagó un tercero — "el esposo mandó el Zelle"». */
function reasonSummary(payment: PaymentData): string | null {
  const t = payment.transfer;
  if (!t) return null;
  const reason = transferReasonLabel(t.reason);
  return t.note ? `${reason} — «${t.note}»` : reason;
}

/**
 * El rastro que deja una transferencia, en dos piezas.
 *
 * Un pago que cambió de dueño no puede parecer un pago normal: quien lo mire dentro de un mes
 * tiene que ver de dónde salió sin ir a buscarlo. Por eso el origen es un chip PERMANENTE bajo
 * la tarjeta del cliente —no una línea más de la bitácora, que hay que abrir— y la bitácora
 * queda para el detalle completo y para los saltos intermedios si hubo varios.
 */

/** Chip permanente bajo la tarjeta del cliente: de qué perfil salió este pago. */
export function TransferOriginChip({ payment }: { payment: PaymentData }) {
  const t = payment.transfer;
  if (!t) return null;

  const from = t.from_client_name || 'otro cliente';
  const when = formatCaracasShortDateTime(t.transferred_at);
  const why = reasonSummary(payment);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-2 text-primary">
      <ArrowRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
      <div className="min-w-0">
        <p className="text-pretty text-[11px]">
          Transferido desde{' '}
          {t.from_client_uuid ? (
            <Link
              href={`/admin/clients/${t.from_client_uuid}`}
              className="font-bold hover:underline"
            >
              {from}
            </Link>
          ) : (
            <span className="font-bold">{from}</span>
          )}
          {[when, t.transferred_by]
            .filter(Boolean)
            .map((part) => ` · ${part}`)
            .join('')}
          {/* Se muestra siempre el PRIMER origen. Cuando hubo más saltos, el número avisa de
              que la bitácora tiene más que contar que este chip. */}
          {t.count > 1 ? ` · ${t.count} transferencias` : ''}
        </p>
        {why ? <p className="mt-0.5 text-pretty text-[11px] opacity-80">{why}</p> : null}
      </div>
    </div>
  );
}

// El punto de la línea de tiempo: solo la transferencia se pinta con el color de marca, para
// que se encuentre de un vistazo entre correcciones y vínculos.
const DOT_TONE: Record<string, string> = {
  TRANSFER: 'bg-primary',
};

/**
 * Bitácora del pago, plegada.
 *
 * Va cerrada y se pide al abrirla: en la mayoría de los comprobantes no hay nada que mirar, y
 * una llamada por cada cajón que se abre no se paga sola.
 */
export function PaymentTimeline({ payment, table }: { payment: PaymentData; table: PaymentTable }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PaymentTimelineEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || items !== null) return;
    const res = await paymentService.getTimeline(table, payment.id);
    if (res.success && res.data) {
      setItems(res.data.items || []);
      setError(null);
    } else {
      // En línea y no en un toast: la bitácora es información de fondo, y un error al
      // consultarla no debe tapar lo que el operador está haciendo en el cajón.
      setItems([]);
      setError(res.error || 'No se pudo cargar la bitácora.');
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 bg-muted/60 px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-foreground">Bitácora del pago</span>
        <span className="text-[11px] font-semibold text-primary">{open ? 'Ocultar' : 'Ver'}</span>
      </button>

      {open ? (
        <div className="bg-card px-3 py-2.5">
          {items === null ? (
            <p className="text-[11px] text-muted-foreground">Cargando…</p>
          ) : error ? (
            <p className="text-[11px] text-muted-foreground">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Sin movimientos registrados en este comprobante.
            </p>
          ) : (
            items.map((entry, i) => (
              <div key={entry.uuid} className="flex gap-2.5">
                <div aria-hidden className="flex w-3.5 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      'mt-1 h-2 w-2 rounded-full',
                      DOT_TONE[entry.kind] ?? 'bg-muted-foreground/40',
                    )}
                  />
                  {i < items.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
                </div>
                <div className={cn('min-w-0', i < items.length - 1 && 'pb-3')}>
                  <div className="text-[12.5px] font-semibold text-foreground">{entry.title}</div>
                  {entry.detail ? (
                    <div className="text-pretty text-[11.5px] text-muted-foreground">
                      {entry.detail}
                    </div>
                  ) : null}
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {[entry.actor ?? 'Automático', formatCaracasShortDateTime(entry.at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
