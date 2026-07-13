'use client';

import { useMemo, useState } from 'react';
import { ArrowDownCircle, HandCoins, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCaracasDateTime } from '@/utils/functions';
import type { LoanData } from '@/types/client';

interface ClientLoansTabProps {
  loans: LoanData[];
  loading: boolean;
  onRepayment: (loanUuid: string, amount: number, notes?: string | null) => Promise<boolean>;
}

function formatAmount(value: number, currency: string) {
  const label = currency === 'USD_BCV' ? 'USD (BCV)' : currency;
  return `${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${label}`;
}

function statusLabel(status: LoanData['status']) {
  if (status === 'PAID') return 'Pagado';
  if (status === 'PARTIAL') return 'Pago parcial';
  if (status === 'CANCELLED') return 'Anulado';
  return 'Pendiente';
}

export function ClientLoansTab({ loans, loading, onRepayment }: ClientLoansTabProps) {
  const [selected, setSelected] = useState<LoanData | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openLoans = useMemo(
    () => loans.filter((loan) => loan.status === 'OPEN' || loan.status === 'PARTIAL'),
    [loans],
  );
  const totals = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const loan of openLoans) {
      grouped.set(loan.preferred_currency, (grouped.get(loan.preferred_currency) ?? 0) + loan.outstanding_amount);
    }
    return Array.from(grouped.entries());
  }, [openLoans]);

  if (loading) return <LoadingState label="Cargando préstamos..." />;

  const openRepayment = (loan: LoanData) => {
    setSelected(loan);
    setAmount(String(loan.outstanding_amount));
    setNotes('');
  };

  const submitRepayment = async () => {
    if (!selected) return;
    const parsed = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return toast.error('El abono debe ser mayor a 0');
    if (parsed > selected.outstanding_amount + 0.00000001) return toast.error('El abono supera el saldo pendiente');
    setSubmitting(true);
    const ok = await onRepayment(selected.uuid, parsed, notes.trim() || null);
    setSubmitting(false);
    if (ok) setSelected(null);
  };

  if (loans.length === 0) {
    return (
      <EmptyState
        icon={HandCoins}
        title="Sin préstamos"
        description="Los pagos salientes marcados como préstamo aparecerán aquí con sus equivalencias y abonos."
      />
    );
  }

  return (
    <div className="space-y-4">
      {totals.length > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <HandCoins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Deuda pendiente
            </div>
            {totals.map(([currency, total]) => (
              <span key={currency} className="text-sm font-semibold text-foreground">
                {formatAmount(total, currency)}
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {loans.map((loan) => {
          const active = loan.status === 'OPEN' || loan.status === 'PARTIAL';
          return (
            <Card key={loan.uuid}>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Pago saliente #{loan.outgoing_payment_id}</h3>
                      <StatusBadge tone={loan.status === 'PAID' ? 'success' : active ? 'warning' : 'neutral'}>
                        {statusLabel(loan.status)}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Creado {formatCaracasDateTime(loan.created_at)}
                      {loan.created_by_username ? ` · ${loan.created_by_username}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saldo en {loan.preferred_value === 'BCV' ? 'BCV' : loan.preferred_value}</p>
                    <p className="text-base font-bold text-foreground">
                      {formatAmount(loan.outstanding_amount, loan.preferred_currency)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted/50 p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Fiat original</p>
                    <p className="text-sm font-medium text-foreground">{formatAmount(loan.fiat_amount, loan.fiat_currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Equivalente USDT</p>
                    <p className="text-sm font-medium text-foreground">{formatAmount(loan.usdt_amount, 'USDT')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Equivalente BCV</p>
                    <p className="text-sm font-medium text-foreground">
                      {loan.bcv_amount != null ? formatAmount(loan.bcv_amount, 'USD_BCV') : 'No aplica'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Equivalencias al {formatCaracasDateTime(loan.valuation_at)}
                  {loan.manual_values ? ' · valores ajustados manualmente' : ''}
                </p>

                {active && loan.current_fiat_due != null ? (
                  <p className="text-sm text-foreground">
                    A pagar hoy: <strong>{formatAmount(loan.current_fiat_due, loan.fiat_currency)}</strong>
                    {loan.current_preferred_rate != null && loan.preferred_value !== 'FIAT'
                      ? ` · tasa ${loan.current_preferred_rate.toLocaleString('es-VE', { maximumFractionDigits: 8 })}`
                      : ''}
                  </p>
                ) : null}
                {loan.notes ? <p className="text-sm text-muted-foreground">{loan.notes}</p> : null}

                {loan.repayments.length > 0 ? (
                  <div className="divide-y divide-border border-t border-border">
                    {loan.repayments.map((repayment) => (
                      <div key={repayment.uuid} className="flex items-start gap-3 py-3">
                        <ArrowDownCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            Abono de {formatAmount(repayment.preferred_amount, loan.preferred_currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatAmount(repayment.fiat_amount, repayment.fiat_currency)} · {formatAmount(repayment.usdt_amount, 'USDT')}
                            {repayment.bcv_amount != null ? ` · ${formatAmount(repayment.bcv_amount, 'USD_BCV')}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCaracasDateTime(repayment.created_at)}
                            {repayment.created_by_username ? ` · ${repayment.created_by_username}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {active ? (
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => openRepayment(loan)}>
                      <ReceiptText className="h-4 w-4" />
                      Registrar abono
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar abono al préstamo</DialogTitle>
            <DialogDescription>
              Ingresa el monto en {selected?.preferred_currency === 'USD_BCV' ? 'USD a tasa BCV' : selected?.preferred_currency}.
              El valor fiat, USDT y BCV se guardará usando las tasas actuales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="loan-repayment-amount">Monto del abono</Label>
              <Input
                id="loan-repayment-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
              {selected?.current_fiat_due != null ? (
                <p className="text-xs text-muted-foreground">
                  Saldo completo hoy: {formatAmount(selected.current_fiat_due, selected.fiat_currency)}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loan-repayment-notes">Nota (opcional)</Label>
              <Textarea
                id="loan-repayment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Referencia o forma de pago"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={submitting}>Cancelar</Button>
            <Button onClick={submitRepayment} disabled={submitting}>
              {submitting ? 'Guardando…' : 'Registrar abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
