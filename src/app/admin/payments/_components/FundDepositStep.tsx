'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { paymentService } from '@/services/paymentService';
import { formatNumber } from '@/utils/functions';
import type { FundDepositSuggestion, PaymentTable } from '@/types/payment';

interface FundDepositStepProps {
  table: PaymentTable;
  paymentId: number;
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Registrar un comprobante como depósito al fondo.
 *
 * El caso: alguien que te debe dinero te manda su comprobante y ese dinero no se retira — se
 * queda en el fondo, a tu nombre. Antes no había forma de decirlo: el comprobante se quedaba
 * huérfano en la bandeja y el depósito se tecleaba aparte en Fondos, sin relación entre los
 * dos (pago 4928, 1.000.000 COP).
 *
 * **Un solo componente para los dos lados.** La diferencia entra por `table`, que es lo único
 * que cambia: el backend usa la dirección para saber quién mandó el comprobante — un entrante
 * lo mandó el dueño del chat, un saliente lo mandaste tú.
 *
 * Monto, moneda y referencia no se editan: son del comprobante. Si el OCR los leyó mal se
 * corrigen en Pagos, donde queda el rastro.
 */
export function FundDepositStep({ table, paymentId, onDone, onCancel }: FundDepositStepProps) {
  const [sug, setSug] = useState<FundDepositSuggestion | null>(null);
  const [userUuid, setUserUuid] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await paymentService.fundDepositSuggestion(table, paymentId);
    setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.error || 'No se pudo preparar el depósito');
      return;
    }
    setSug(res.data);
    setUserUuid(res.data.user_uuid ?? '');
  }, [table, paymentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const guardar = async () => {
    if (!sug?.fund_group_uuid || !userUuid) return;
    setSubmitting(true);
    const res = await paymentService.createFundDeposit(table, paymentId, {
      group_uuid: sug.fund_group_uuid,
      user_uuid: userUuid,
    });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error || 'No se pudo registrar el depósito');
      return;
    }
    toast.success('Depósito registrado · confírmalo en Fondos → Depósitos pendientes');
    onDone();
  };

  if (loading) return <LoadingState />;
  if (!sug) return null;

  // Sin fondo no hay depósito posible: el comprobante no llegó por el canal de ninguno. Es el
  // caso del chat de un cliente, y proponerle uno sería inventarlo.
  const sinFondo = !sug.fund_group_uuid;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {sug.amount != null ? formatNumber(sug.amount) : '—'}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{sug.currency ?? ''}</span>
          {sug.reference ? (
            <span className="text-xs text-muted-foreground">· ref {sug.reference}</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Monto, moneda y referencia salen del comprobante. No se teclean.
        </p>
      </div>

      {sinFondo ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Este comprobante no llegó por el canal de ningún fondo, así que no hay a cuál
          asignarlo. Los depósitos entran por el grupo del fondo o por el chat directo de su
          gestor.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              Fondo
            </span>
            <div className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm font-medium text-foreground">
              {sug.fund_group_name}
              {sug.fund_currency ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  · {sug.fund_currency}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground">
              ↳ el comprobante llegó por el canal de ese fondo
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              A nombre de
            </span>
            <Select value={userUuid} onValueChange={(v) => setUserUuid(v ?? '')}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Elige el gestor" />
              </SelectTrigger>
              <SelectContent>
                {sug.members.map((m) => (
                  <SelectItem key={m.user_uuid} value={m.user_uuid}>
                    {m.username ?? m.user_uuid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {sug.user_uuid
                ? table === 'outgoing'
                  ? '↳ es un saliente, así que lo mandaste tú'
                  : '↳ es un entrante, así que lo mandó el dueño del chat'
                : '↳ no se pudo deducir de quién es: elígelo'}
            </p>
          </div>

          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Queda <strong className="font-semibold text-foreground">pendiente de confirmar</strong>{' '}
            en Fondos → Depósitos pendientes, con este comprobante enganchado como evidencia.
          </p>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button size="sm" onClick={guardar} disabled={sinFondo || !userUuid || submitting}>
          {submitting ? 'Registrando…' : 'Registrar depósito'}
        </Button>
      </div>
    </div>
  );
}
