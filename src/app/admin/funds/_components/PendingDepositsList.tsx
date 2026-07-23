'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Inbox, Plus, X } from 'lucide-react';
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
import type { CommissionUserResponse } from '@/types/user';
import type { PendingDeposit } from '@/types/fund';

interface PendingDepositsListProps {
  groupUuid: string | null;
  availableUsers: CommissionUserResponse[];
  onConfirmed?: () => void;
}

interface ConfirmForm {
  method: string;
  amount: string;
  currency: string;
  notes: string;
}

interface ManualForm {
  user_uuid: string;
  amount: string;
  currency: string;
  provider: string;
  reference: string;
  notes: string;
}

const emptyManualForm: ManualForm = {
  user_uuid: '',
  amount: '',
  currency: 'USD',
  provider: '',
  reference: '',
  notes: '',
};

export function PendingDepositsList({
  groupUuid,
  availableUsers,
  onConfirmed,
}: PendingDepositsListProps) {
  const confirm = useConfirm();
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [target, setTarget] = useState<PendingDeposit | null>(null);
  const [form, setForm] = useState<ConfirmForm>({ method: 'ZELLE', amount: '', currency: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState<ManualForm>(emptyManualForm);

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
    // Duplicado de un entrante: ese dinero ya entró al fondo por la operación del cliente.
    // El backend lo rechaza salvo que el operador lo asuma explícitamente.
    let overrideDuplicate = false;
    if (target.source_incoming_payment_id != null) {
      const ok = await confirm({
        title: 'Posible depósito duplicado',
        description:
          `Este comprobante coincide con el pago entrante #${target.source_incoming_payment_id}` +
          (target.source_incoming_payment_phone ? ` de ${target.source_incoming_payment_phone}` : '') +
          '. Ese dinero ya está contabilizado como pago del cliente; registrarlo también como ' +
          'depósito lo contaría dos veces. ¿Es de verdad una reposición aparte?',
        confirmText: 'Sí, es otro dinero',
        variant: 'destructive',
      });
      if (!ok) return;
      overrideDuplicate = true;
    }
    setSubmitting(true);
    const res = await fundService.confirmPendingDeposit(target.uuid, {
      deposit_method: form.method,
      amount,
      currency: form.currency.trim().toUpperCase(),
      notes: form.notes.trim() || undefined,
      override_duplicate: overrideDuplicate,
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

  const submitManual = async () => {
    if (!groupUuid) return;
    const amount = Number(manual.amount);
    if (!manual.user_uuid) {
      toast.error('Selecciona el gestor que depositó');
      return;
    }
    if (!manual.amount.trim() || Number.isNaN(amount) || amount <= 0) {
      toast.error('Monto inválido');
      return;
    }
    if (!manual.currency.trim()) {
      toast.error('La moneda es requerida');
      return;
    }
    setSubmitting(true);
    const res = await fundService.createPendingDeposit({
      group_uuid: groupUuid,
      user_uuid: manual.user_uuid,
      amount,
      currency: manual.currency.trim().toUpperCase(),
      provider: manual.provider.trim() || undefined,
      reference: manual.reference.trim() || undefined,
      notes: manual.notes.trim() || undefined,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success('Depósito pendiente creado — confírmalo para aplicarlo al fondo');
      setManual(emptyManualForm);
      setManualOpen(false);
      void load();
    } else {
      toast.error(res.error || 'No se pudo crear el depósito pendiente');
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

  // Se muestra siempre que haya un grupo seleccionado: es el único lugar desde donde se
  // registra un depósito (el alta manual de movimientos ya no acepta DEPOSIT).
  if (!groupUuid && deposits.length === 0) return null;

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Depósitos pendientes ({deposits.length})
            </h3>
          </div>
          {groupUuid ? (
            <Button variant="outline" size="sm" className="h-9" onClick={() => setManualOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Registrar depósito
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Comprobantes que un gestor subió al grupo. Confírmalos para crear el depósito en el
          fondo — es el único camino: el alta de movimientos ya no acepta depósitos.
        </p>

        {deposits.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Nada pendiente. Si un gestor repuso el fondo y el bot no lo detectó, usa
            «Registrar depósito».
          </p>
        ) : (
          <ul className="space-y-2">
            {deposits.map((d) => (
              <li
                key={d.uuid}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {d.amount != null
                        ? d.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })
                        : 'Sin monto'}{' '}
                      {d.currency ?? ''}
                    </span>
                    {d.group_name ? <StatusBadge tone="neutral">{d.group_name}</StatusBadge> : null}
                    {d.origin === 'MANUAL' ? <StatusBadge tone="info">Manual</StatusBadge> : null}
                    {d.source_incoming_payment_id != null ? (
                      <StatusBadge tone="warning">
                        Posible duplicado · entrante #{d.source_incoming_payment_id}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Gestor: {d.detected_username ?? '—'}
                    {d.provider ? ` · ${d.provider}` : ''}
                    {d.reference ? ` · Ref: ${d.reference}` : ''}
                    {d.created_by_username ? ` · Cargado por ${d.created_by_username}` : ''}
                  </p>
                  {d.source_incoming_payment_id != null ? (
                    <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Coincide con un pago de cliente ya contabilizado
                        {d.source_incoming_payment_phone
                          ? ` (${d.source_incoming_payment_phone})`
                          : ''}
                        . Descártalo salvo que sea una reposición aparte.
                      </span>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" className="h-9" onClick={() => openConfirm(d)}>
                    <Check className="h-3.5 w-3.5" />
                    Confirmar
                  </Button>
                  <Button variant="outline" size="sm" className="h-9" onClick={() => handleReject(d)}>
                    <X className="h-3.5 w-3.5" />
                    Descartar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
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

      <Dialog open={manualOpen} onOpenChange={(open) => !open && setManualOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar depósito</DialogTitle>
            <DialogDescription>
              Para el depósito que el bot no detectó en el grupo. Queda pendiente y se aplica al
              fondo al confirmarlo, igual que los detectados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="man-user">
                Gestor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={manual.user_uuid}
                onValueChange={(v) => setManual((f) => ({ ...f, user_uuid: (v as string) ?? '' }))}
              >
                <SelectTrigger id="man-user" className="h-10 w-full">
                  <SelectValue placeholder="Seleccionar gestor..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.uuid} value={u.uuid}>
                      {u.full_name || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="man-amount">
                  Monto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="man-amount"
                  inputMode="decimal"
                  value={manual.amount}
                  onChange={(e) => setManual((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="man-currency">
                  Moneda <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="man-currency"
                  value={manual.currency}
                  onChange={(e) => setManual((f) => ({ ...f, currency: e.target.value }))}
                  placeholder="USD"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="man-provider">Proveedor</Label>
                <Input
                  id="man-provider"
                  value={manual.provider}
                  onChange={(e) => setManual((f) => ({ ...f, provider: e.target.value }))}
                  placeholder="zelle, kraken…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="man-reference">Referencia</Label>
                <Input
                  id="man-reference"
                  value={manual.reference}
                  onChange={(e) => setManual((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="Nº de confirmación"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="man-notes">Nota (opcional)</Label>
              <Input
                id="man-notes"
                value={manual.notes}
                onChange={(e) => setManual((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Por qué se carga a mano"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submitManual} disabled={submitting}>
              {submitting ? 'Guardando…' : 'Crear pendiente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
