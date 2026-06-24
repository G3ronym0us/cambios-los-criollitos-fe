'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Inbox, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useConfirm } from '@/hooks/useConfirm';
import { fundService } from '@/services/fundService';
import { DEPOSIT_METHODS } from '@/types/payment';
import type { PendingDeposit } from '@/types/fund';

interface PendingDepositsListProps {
  groupUuid: string | null;
  onConfirmed?: () => void;
}

interface ConfirmForm {
  method: string;
  amount: string;
  currency: string;
  notes: string;
}

export function PendingDepositsList({ groupUuid, onConfirmed }: PendingDepositsListProps) {
  const confirm = useConfirm();
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [target, setTarget] = useState<PendingDeposit | null>(null);
  const [form, setForm] = useState<ConfirmForm>({ method: 'ZELLE', amount: '', currency: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fundService.listPendingDeposits('PENDING');
    if (res.success && res.data) {
      const all = res.data;
      setDeposits(groupUuid ? all.filter((d) => d.group_uuid === groupUuid) : all);
    }
  }, [groupUuid]);

  useEffect(() => {
    void load();
  }, [load]);

  const openConfirm = (d: PendingDeposit) => {
    setForm({
      method: 'ZELLE',
      amount: d.amount != null ? String(d.amount) : '',
      currency: d.currency ?? '',
      notes: '',
    });
    setTarget(d);
  };

  const submitConfirm = async () => {
    if (!target) return;
    const amount = form.amount.trim() ? Number(form.amount) : undefined;
    if (amount != null && (Number.isNaN(amount) || amount <= 0)) {
      toast.error('Monto inválido');
      return;
    }
    if (!form.currency.trim()) {
      toast.error('La moneda es requerida');
      return;
    }
    setSubmitting(true);
    const res = await fundService.confirmPendingDeposit(target.uuid, {
      deposit_method: form.method,
      amount,
      currency: form.currency.trim().toUpperCase(),
      notes: form.notes.trim() || undefined,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success('Depósito confirmado');
      setDeposits((prev) => prev.filter((d) => d.uuid !== target.uuid));
      setTarget(null);
      onConfirmed?.();
    } else {
      toast.error(res.error || 'No se pudo confirmar el depósito');
    }
  };

  const handleReject = async (d: PendingDeposit) => {
    const ok = await confirm({
      title: 'Descartar depósito',
      description: 'El depósito pendiente se descartará sin crear ningún movimiento.',
      confirmText: 'Descartar',
      variant: 'destructive',
    });
    if (!ok) return;
    const res = await fundService.rejectPendingDeposit(d.uuid);
    if (res.success) {
      toast.success('Depósito descartado');
      setDeposits((prev) => prev.filter((x) => x.uuid !== d.uuid));
    } else {
      toast.error(res.error || 'No se pudo descartar');
    }
  };

  if (deposits.length === 0) return null;

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Depósitos pendientes ({deposits.length})
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Comprobantes que un gestor subió al grupo. Confírmalos para crear el depósito en el fondo.
        </p>

        <ul className="space-y-2">
          {deposits.map((d) => (
            <li
              key={d.uuid}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {d.amount != null ? d.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : 'Sin monto'}{' '}
                    {d.currency ?? ''}
                  </span>
                  {d.group_name ? <StatusBadge tone="neutral">{d.group_name}</StatusBadge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Gestor: {d.detected_username ?? '—'}
                  {d.provider ? ` · ${d.provider}` : ''}
                  {d.reference ? ` · Ref: ${d.reference}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" className="h-8" onClick={() => openConfirm(d)}>
                  <Check className="h-3.5 w-3.5" />
                  Confirmar
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => handleReject(d)}>
                  <X className="h-3.5 w-3.5" />
                  Descartar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar depósito</DialogTitle>
            <DialogDescription>
              Se creará un movimiento de depósito en el fondo a nombre del gestor detectado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dep-method">Método</Label>
              <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v ?? 'ZELLE' }))}>
                <SelectTrigger id="dep-method" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPOSIT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dep-amount">Monto</Label>
                <Input
                  id="dep-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dep-currency">Moneda</Label>
                <Input
                  id="dep-currency"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  placeholder="USD"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dep-notes">Nota (opcional)</Label>
              <Input
                id="dep-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Comentario del depósito"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submitConfirm} disabled={submitting}>
              {submitting ? 'Guardando…' : 'Confirmar depósito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
