'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SidePanelBody, SidePanelFooter } from '@/components/shared/SidePanel';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { paymentService } from '@/services/paymentService';
import { formatCaracasShortDateTime, formatNumber } from '@/utils/functions';
import type { OutgoingRefundSummary, PaymentData } from '@/types/payment';

interface OutgoingRefundsStepProps {
  payment: PaymentData;
  onDone: () => void;
  onCancel: () => void;
}

/** Una devolución en el borrador: con su entrante, o con nota si no llegó comprobante. */
interface Row {
  incoming_payment_id: number | null;
  amount: number;
  label: string;
  note: string | null;
}

function parseAmount(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Lo que el cliente devolvió de un pago hecho de más.
 *
 * El caso (saliente 5917): se tecleó en el banco la cifra en COP y salieron 28.900 Bs por una
 * operación de 8.324,88; el beneficiario devolvió 20.500 (entrante 636). Registrado aquí, el
 * pago cuenta por su NETO para cubrir operaciones —el excedente deja de ofrecerse a otras— y
 * el entrante de la devolución queda con destino.
 */
export function OutgoingRefundsStep({ payment, onDone, onCancel }: OutgoingRefundsStepProps) {
  const [summary, setSummary] = useState<OutgoingRefundSummary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    paymentService.getRefunds(payment.id).then((res) => {
      if (!res.success || !res.data) {
        toast.error(res.error || 'No se pudo cargar lo devuelto');
        return;
      }
      setSummary(res.data);
      setRows(
        res.data.refunds.map((r) => ({
          incoming_payment_id: r.incoming_payment_id,
          amount: r.amount,
          label: r.incoming_payment_id
            ? `Entrante #${r.incoming_payment_id}${r.incoming_reference ? ` · ${r.incoming_reference}` : ''}`
            : 'Sin comprobante',
          note: r.note,
        })),
      );
    });
  }, [payment.id]);

  if (!summary) {
    return (
      <SidePanelBody className="justify-center">
        <LoadingState />
      </SidePanelBody>
    );
  }

  const cur = summary.currency ?? '';
  const paid = summary.amount ?? 0;
  const refunded = Math.round(rows.reduce((acc, r) => acc + r.amount, 0) * 100) / 100;
  const net = Math.round((paid - refunded) * 100) / 100;
  const used = new Set(rows.map((r) => r.incoming_payment_id).filter((id): id is number => id != null));
  const candidates = summary.candidates.filter((c) => !used.has(c.incoming_payment_id));
  const manual = parseAmount(manualAmount);

  const addManual = () => {
    if (manual === null || !manualNote.trim()) return;
    setRows((prev) => [
      ...prev,
      { incoming_payment_id: null, amount: manual, label: 'Sin comprobante', note: manualNote.trim() },
    ]);
    setManualAmount('');
    setManualNote('');
  };

  const save = async () => {
    setSaving(true);
    const res = await paymentService.setRefunds(
      payment.id,
      rows.map((r) =>
        r.incoming_payment_id != null
          ? { incoming_payment_id: r.incoming_payment_id, amount: r.amount, note: r.note ?? undefined }
          : { amount: r.amount, note: r.note ?? undefined },
      ),
    );
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'No se pudo guardar lo devuelto');
      return;
    }
    toast.success(rows.length ? 'Devolución registrada' : 'Devoluciones quitadas');
    onDone();
  };

  return (
    <>
      <SidePanelBody className="gap-3">
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/40 p-3 text-center tabular-nums">
          <div>
            <p className="text-[11px] text-muted-foreground">Pagado</p>
            <p className="text-sm font-semibold">{formatNumber(paid)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Devuelto</p>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {refunded ? `− ${formatNumber(refunded)}` : '0'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Neto entregado</p>
            <p className="text-sm font-semibold">
              {formatNumber(net)} {cur}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            Devoluciones
          </span>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ninguna todavía.</p>
          ) : (
            rows.map((r, i) => (
              <div
                key={`${r.incoming_payment_id ?? 'manual'}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.label}</span>
                  {r.note ? <span className="block truncate text-xs text-muted-foreground">{r.note}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 tabular-nums">
                  <span className="text-sm">
                    {formatNumber(r.amount)} {cur}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar devolución"
                    onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </div>
            ))
          )}
        </div>

        {candidates.length ? (
          <div className="space-y-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              Comprobantes que pueden ser la devolución
            </span>
            {candidates.map((c) => (
              <div
                key={c.incoming_payment_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2"
              >
                <span className="min-w-0 text-xs text-muted-foreground">
                  <span className="block text-sm font-medium text-foreground tabular-nums">
                    {formatNumber(c.amount ?? 0)} {c.currency ?? cur}
                  </span>
                  Entrante #{c.incoming_payment_id}
                  {c.created_at ? ` · ${formatCaracasShortDateTime(c.created_at)}` : ''}
                  {c.identification ? ` · ${c.identification}` : ''}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving || !c.amount}
                  onClick={() =>
                    setRows((prev) => [
                      ...prev,
                      {
                        incoming_payment_id: c.incoming_payment_id,
                        amount: c.amount ?? 0,
                        label: `Entrante #${c.incoming_payment_id}${c.reference ? ` · ${c.reference}` : ''}`,
                        note: null,
                      },
                    ])
                  }
                >
                  Es la devolución
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-1.5 rounded-lg border border-border p-3">
          <span className="text-xs font-medium">Devolución sin comprobante</span>
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              placeholder={`Monto (${cur})`}
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              className="h-9 w-32"
              disabled={saving}
            />
            <Input
              placeholder="Cómo se devolvió (obligatorio)"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              className="h-9 flex-1"
              disabled={saving}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Agregar devolución"
              onClick={addManual}
              disabled={saving || manual === null || !manualNote.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {refunded > paid + 0.01 ? (
          <p className="text-xs text-destructive">Lo devuelto no puede pasar de lo pagado.</p>
        ) : null}
      </SidePanelBody>

      <SidePanelFooter>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <Button onClick={() => void save()} disabled={saving || refunded > paid + 0.01}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </SidePanelFooter>
    </>
  );
}
