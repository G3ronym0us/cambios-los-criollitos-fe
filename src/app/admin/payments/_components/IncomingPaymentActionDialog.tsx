'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Landmark, Link2, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fundService } from '@/services/fundService';
import { paymentService } from '@/services/paymentService';
import { DEPOSIT_METHODS } from '@/types/payment';
import type { PaymentData } from '@/types/payment';
import type { FundGroup } from '@/types/fund';
import { LinkOperationPanel } from './LinkOperationPanel';

interface IncomingPaymentActionDialogProps {
  payment: PaymentData | null;
  onClose: () => void;
  onDone: () => void;
}

type Step = 'choose' | 'operation' | 'deposit';

function digitsOnly(phone: string | null | undefined) {
  return (phone || '').replace(/@(c|g)\.us$/, '').replace(/\D/g, '');
}

export function IncomingPaymentActionDialog({ payment, onClose, onDone }: IncomingPaymentActionDialogProps) {
  const [step, setStep] = useState<Step>('choose');
  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [groupUuid, setGroupUuid] = useState('');
  const [method, setMethod] = useState<string>('ZELLE');
  const [depositorUuid, setDepositorUuid] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setStep('choose');
    setGroupUuid('');
    setMethod('ZELLE');
    setDepositorUuid('');
    setAmount(payment.amount != null ? String(payment.amount) : '');
    setCurrency(payment.currency || '');
    setReference(payment.reference || '');
    setSubmitting(false);
    fundService.getGroups().then((res) => {
      if (res.success && res.data) setGroups(res.data.filter((g) => g.is_active));
    });
  }, [payment]);

  const group = useMemo(() => groups.find((g) => g.uuid === groupUuid), [groups, groupUuid]);

  // Al elegir fondo: precargar depositante por match de teléfono y moneda por la base del fondo.
  useEffect(() => {
    if (!group || !payment) return;
    const members = group.members ?? [];
    const phone = digitsOnly(payment.client_phone);
    const matched = phone ? members.find((m) => digitsOnly(m.whatsapp_phone) === phone) : undefined;
    const manager = members.find((m) => m.is_fund_manager);
    setDepositorUuid((matched ?? manager ?? members[0])?.user_uuid ?? '');
    if (group.currency) setCurrency(group.currency);
  }, [group, payment]);

  if (!payment) return null;

  const finish = () => {
    onDone();
    onClose();
  };

  const saveDeposit = async () => {
    const amt = parseFloat(amount.replace(',', '.'));
    if (!groupUuid) return toast.error('Selecciona un fondo');
    if (!depositorUuid) return toast.error('Selecciona quién depositó');
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('El monto debe ser mayor a 0');
    if (!currency.trim()) return toast.error('Indica la moneda del depósito');

    setSubmitting(true);
    const res = await paymentService.createDeposit(payment.id, {
      groupUuid,
      userUuid: depositorUuid,
      amount: amt,
      currency: currency.trim().toUpperCase(),
      depositMethod: method,
      reference: reference.trim() || null,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago registrado como depósito al fondo');
      finish();
    } else {
      toast.error(res.error || 'No se pudo registrar el depósito');
    }
  };

  const members = group?.members ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        {step === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle>¿Qué quieres hacer con este pago?</DialogTitle>
              <DialogDescription>
                Vincúlalo a una operación o regístralo como un depósito a un fondo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStep('operation')}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Link2 className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">Vincular a una operación</span>
                  <span className="block truncate text-xs text-muted-foreground">Asociar el pago a una cotización del cliente.</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => setStep('deposit')}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <PiggyBank className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">Registrar como depósito a fondo</span>
                  <span className="block truncate text-xs text-muted-foreground">Suma al fondo como depósito del gestor (Zelle, Binance…).</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
            </DialogFooter>
          </>
        ) : step === 'operation' ? (
          <>
            <DialogHeader>
              <DialogTitle>Vincular a operación</DialogTitle>
              <DialogDescription>
                Elige la cotización a la que pertenece este pago. Busca por cliente, par, monto o ID.
              </DialogDescription>
            </DialogHeader>
            <LinkOperationPanel
              payment={payment}
              table="incoming"
              onSuccess={finish}
              onCancel={() => setStep('choose')}
              cancelLabel="Volver"
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Registrar depósito a fondo</DialogTitle>
              <DialogDescription>
                Se crea un movimiento de depósito en el fondo, vinculado a este pago.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <Label htmlFor="deposit-fund">Fondo</Label>
                <Select value={groupUuid} onValueChange={(v) => setGroupUuid(v ?? '')}>
                  <SelectTrigger id="deposit-fund" className="h-10 w-full">
                    <SelectValue>
                      {group
                        ? `${group.name}${group.currency ? ` · ${group.currency}` : ''}`
                        : 'Selecciona un fondo'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.uuid} value={g.uuid}>
                        {g.name}{g.currency ? ` · ${g.currency}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deposit-method">Método / origen</Label>
                <Select value={method} onValueChange={(v) => setMethod(v ?? 'ZELLE')}>
                  <SelectTrigger id="deposit-method" className="h-10 w-full">
                    <SelectValue>{method}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DEPOSIT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deposit-by">Depositó</Label>
                <Select value={depositorUuid} onValueChange={(v) => setDepositorUuid(v ?? '')} disabled={!group}>
                  <SelectTrigger id="deposit-by" className="h-10 w-full">
                    <SelectValue>
                      {members.find((m) => m.user_uuid === depositorUuid)?.username
                        ?? (group ? 'Selecciona el gestor' : 'Elige un fondo primero')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_uuid} value={m.user_uuid}>
                        {m.username || m.user_uuid}{m.is_fund_manager ? ' · gestor' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="deposit-amount">Monto</Label>
                  <Input
                    id="deposit-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deposit-currency">Moneda</Label>
                  <Input
                    id="deposit-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="USD"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deposit-ref">Referencia (opcional)</Label>
                <Input
                  id="deposit-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ref del comprobante"
                  className="h-10"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => setStep('choose')} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button onClick={saveDeposit} disabled={submitting}>
                <Landmark className="h-4 w-4" />
                {submitting ? 'Guardando…' : 'Registrar depósito'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
