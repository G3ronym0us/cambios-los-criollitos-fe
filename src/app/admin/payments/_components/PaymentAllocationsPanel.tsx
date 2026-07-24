'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingState } from '@/components/shared/LoadingState';
import { paymentService } from '@/services/paymentService';
import { formatNumber } from '@/utils/functions';
import type { OperationData } from '@/types/operation';
import type { PaymentAllocationSummary, PaymentData } from '@/types/payment';
import { LinkOperationPanel } from './LinkOperationPanel';

interface PaymentAllocationsPanelProps {
  payment: PaymentData;
  onSaved: () => void;
  onCancel: () => void;
  /** Ir al paso de acreditar saldo con el sobrante ya cargado. */
  onCreditRest?: (amount: number) => void;
}

/** Fila editable del reparto. `pair`/`to` son solo para mostrar de dónde sale cada parte. */
interface Row {
  operation_uuid: string;
  amount: string;
  pair_symbol: string | null;
  to_amount: number | null;
  to_currency: string | null;
  status: string | null;
  paid_with: { id: number; amount: number | null; currency: string | null }[];
}

/**
 * Reparte un pago entrante entre varias operaciones. El caso que lo motivó: un Zelle de 220
 * que pagó 200 de un cambio a BRL y 20 de otro a VES — con un solo vínculo, la segunda
 * operación se quedaba sin comprobante.
 */
export function PaymentAllocationsPanel({
  payment,
  onSaved,
  onCancel,
  onCreditRest,
}: PaymentAllocationsPanelProps) {
  const [summary, setSummary] = useState<PaymentAllocationSummary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await paymentService.getAllocations(payment.id);
    setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.error || 'No se pudo cargar el reparto');
      return;
    }
    setSummary(res.data);
    setRows(
      res.data.allocations.map((a) => ({
        operation_uuid: a.operation_uuid ?? '',
        amount: String(a.amount),
        pair_symbol: a.pair_symbol,
        to_amount: a.to_amount,
        to_currency: a.to_currency,
        status: a.operation_status,
        paid_with: a.paid_with ?? [],
      })),
    );
  }, [payment.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = summary?.amount ?? payment.amount ?? 0;
  const credited = summary?.credited_to_balance ?? 0;
  const assigned = rows.reduce((acc, r) => acc + (Number(r.amount.replace(',', '.')) || 0), 0);
  const unassigned = Math.round((total - assigned - credited) * 100) / 100;

  const addOperation = (op: OperationData) => {
    setPicking(false);
    if (rows.some((r) => r.operation_uuid === op.uuid)) {
      toast.error('Esa operación ya está en el reparto');
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        operation_uuid: op.uuid,
        // Por defecto, lo que falte por asignar sin pasarse de lo que pide la operación.
        amount: String(Math.max(0, Math.min(unassigned, op.from_amount))),
        pair_symbol: op.pair_symbol,
        to_amount: op.to_amount,
        to_currency: op.to_currency,
        status: op.status,
        paid_with: [],
      },
    ]);
  };

  const save = async () => {
    const parsed = rows.map((r) => ({
      operation_uuid: r.operation_uuid,
      amount: Number(r.amount.replace(',', '.')),
    }));
    if (parsed.some((r) => !Number.isFinite(r.amount) || r.amount <= 0)) {
      toast.error('Cada parte del reparto debe ser mayor a 0');
      return;
    }
    if (unassigned < -0.01) {
      toast.error('El reparto se pasa del monto del pago');
      return;
    }
    setSubmitting(true);
    const res = await paymentService.setAllocations(payment.id, parsed);
    setSubmitting(false);
    if (res.success) {
      toast.success('Reparto guardado');
      onSaved();
    } else {
      toast.error(res.error || 'No se pudo guardar el reparto');
    }
  };

  if (picking) {
    return (
      <LinkOperationPanel
        payment={payment}
        table="incoming"
        onSuccess={() => setPicking(false)}
        onCancel={() => setPicking(false)}
        cancelLabel="Volver"
        onPick={addOperation}
        pickLabel="Añadir al reparto"
      />
    );
  }

  if (loading) return <LoadingState label="Cargando reparto..." />;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium text-foreground">
            {formatNumber(total)} {summary?.currency ?? payment.currency ?? ''}
          </span>
          <span className="text-xs text-muted-foreground">
            Asignado {formatNumber(assigned)}
            {credited > 0 ? ` · Saldo ${formatNumber(credited)}` : ''}
          </span>
          {unassigned > 0.01 ? (
            <StatusBadge tone="warning">Sin asignar {formatNumber(unassigned)}</StatusBadge>
          ) : unassigned < -0.01 ? (
            <StatusBadge tone="destructive">Se pasa {formatNumber(-unassigned)}</StatusBadge>
          ) : (
            <StatusBadge tone="success">Cuadrado</StatusBadge>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Este pago todavía no respalda ninguna operación.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, index) => (
              <li key={row.operation_uuid} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                      {row.pair_symbol ?? 'Operación'}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.to_amount != null ? formatNumber(row.to_amount) : '—'} {row.to_currency ?? ''}
                      {row.status ? <StatusBadge tone="neutral">{row.status}</StatusBadge> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.paid_with.length > 0
                        ? `Pagada con ${row.paid_with
                            .map((p) => `${formatNumber(p.amount ?? 0)} ${p.currency ?? ''}`.trim())
                            .join(' + ')}`
                        : 'Sin comprobante de salida todavía'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Input
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, amount: e.target.value } : r)),
                        )
                      }
                      className="h-9 w-24 text-right"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 text-destructive hover:text-destructive"
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Quitar del reparto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => setPicking(true)}>
            <Plus className="h-3.5 w-3.5" />
            Añadir operación
          </Button>
          {unassigned > 0.01 && onCreditRest ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => onCreditRest(unassigned)}
            >
              <Wallet className="h-3.5 w-3.5" />
              Acreditar {formatNumber(unassigned)} al saldo
            </Button>
          ) : null}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <Button onClick={save} disabled={submitting || rows.length === 0}>
          {submitting ? 'Guardando…' : 'Guardar reparto'}
        </Button>
      </DialogFooter>
    </>
  );
}
