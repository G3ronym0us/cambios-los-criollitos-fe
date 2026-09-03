'use client';

import { useState } from 'react';
import { ArrowDownCircle, HandCoins, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatAmountForInput, formatCaracasDateTime, sanitizeAmountInput } from '@/utils/functions';
import type { LoanData, LoanTotals, ManualLoanCreate } from '@/types/client';
import { NewLoanDialog } from './NewLoanDialog';

interface ClientLoansTabProps {
  clientUuid: string;
  loans: LoanData[];
  totals: LoanTotals | null;
  loading: boolean;
  onRepayment: (loanUuid: string, amount: number, notes?: string | null) => Promise<boolean>;
  onCreateLoan: (body: ManualLoanCreate) => Promise<boolean>;
}

function formatAmount(value: number, currency: string) {
  const label = currency === 'USD_BCV' ? 'USD (BCV)' : currency;
  return `${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${label}`;
}

/**
 * «Saldo en FIAT» no es español: sale de `preferred_value` tal cual, y ese campo enseña
 * FIAT/USDT/BCV. Aquí se dice en qué se lleva la cuenta con palabras — la moneda fiat en
 * la que se registró el préstamo cuando el modo es FIAT, no una tercera cosa.
 */
function preferredValueLabel(loan: LoanData): string {
  if (loan.preferred_value === 'USDT') return 'Saldo en USDT';
  if (loan.preferred_value === 'BCV') return 'Saldo a tasa BCV';
  const FIAT_WORD: Record<string, string> = {
    USD: 'dólares',
    VES: 'bolívares',
    COP: 'pesos',
    BRL: 'reales',
  };
  return `Saldo en ${FIAT_WORD[loan.fiat_currency] ?? loan.fiat_currency}`;
}

function statusLabel(status: LoanData['status']) {
  if (status === 'PAID') return 'Pagado';
  if (status === 'PARTIAL') return 'Pago parcial';
  if (status === 'CANCELLED') return 'Anulado';
  return 'Pendiente';
}

export function ClientLoansTab({
  clientUuid,
  loans,
  totals,
  loading,
  onRepayment,
  onCreateLoan,
}: ClientLoansTabProps) {
  const [selected, setSelected] = useState<LoanData | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);

  if (loading) return <LoadingState label="Cargando préstamos..." />;

  const openRepayment = (loan: LoanData) => {
    setSelected(loan);
    setAmount(formatAmountForInput(loan.outstanding_amount));
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

  return (
    <div className="space-y-4">
      <NewLoanDialog
        clientUuid={clientUuid}
        open={creating}
        onOpenChange={setCreating}
        onCreate={onCreateLoan}
      />

      {/* «Registrar préstamo» vive dentro de la tarjeta de deuda cuando la hay: suelto
          arriba ocupaba una fila entera para no decir nada. Sin deuda que mostrar (cliente
          sin préstamos, o todos pagados) se queda solo, que es su único sitio posible. */}
      {totals && totals.by_reference.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <HandCoins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  Deuda pendiente
                </div>
                {totals.usdt_total != null ? (
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {formatAmount(totals.usdt_total, 'USDT')}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {totals.by_reference.map((row) => (
                    <span key={row.currency} className="text-sm font-semibold text-muted-foreground">
                      {formatAmount(row.amount, row.currency)}
                    </span>
                  ))}
                </div>
              </div>
              <Button variant="outline" className="h-11 shrink-0" onClick={() => setCreating(true)}>
                <HandCoins className="h-4 w-4" />
                Registrar préstamo
              </Button>
            </div>
            {totals.warnings.map((warning) => (
              <p key={warning} className="text-xs text-amber-700 dark:text-amber-400">{warning}</p>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-end">
          <Button variant="outline" className="h-11" onClick={() => setCreating(true)}>
            <HandCoins className="h-4 w-4" />
            Registrar préstamo
          </Button>
        </div>
      )}

      {loans.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Sin préstamos"
          description="Registra uno a mano o marca un pago saliente como préstamo desde la bandeja."
        />
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => {
            const active = loan.status === 'OPEN' || loan.status === 'PARTIAL';
            return (
              <Card key={loan.uuid}>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {loan.outgoing_payment_id != null ? `Pago saliente #${loan.outgoing_payment_id}` : 'Préstamo sin comprobante'}
                        </h3>
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
                      <p className="text-xs text-muted-foreground">{preferredValueLabel(loan)}</p>
                      <p className="text-base font-bold text-foreground">
                        {formatAmount(loan.outstanding_amount, loan.preferred_currency)}
                      </p>
                    </div>
                  </div>

                  {/* Etiqueta a la izquierda, cifra a la derecha — es como se comparan tres
                      equivalencias del mismo monto. De bloque-encima-de-valor ocupaban el
                      doble sin decir más. */}
                  <div className="divide-y divide-border rounded-lg bg-muted/50 px-3">
                    <div className="flex items-center justify-between gap-3 py-2">
                      <span className="text-xs text-muted-foreground">Fiat original</span>
                      <span className="text-sm font-medium text-foreground">{formatAmount(loan.fiat_amount, loan.fiat_currency)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <span className="text-xs text-muted-foreground">Equivalente USDT</span>
                      <span className="text-sm font-medium text-foreground">{formatAmount(loan.usdt_amount, 'USDT')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <span className="text-xs text-muted-foreground">Equivalente BCV</span>
                      <span className="text-sm font-medium text-foreground">
                        {loan.bcv_amount != null ? formatAmount(loan.bcv_amount, 'USD_BCV') : 'No aplica'}
                      </span>
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
                      <Button variant="outline" className="h-11" onClick={() => openRepayment(loan)}>
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
      )}

      {/* Hoja desde abajo en móvil, tarjeta centrada en ≥sm — mismo `Drawer` que el resto
          del módulo. Era `Dialog`, y un modal centrado con teclado numérico abierto en 390
          px deja media pantalla de fondo oscurecido sin ninguna utilidad. */}
      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Registrar abono al préstamo</DrawerTitle>
            <DrawerDescription>
              Ingresa el monto en {selected?.preferred_currency === 'USD_BCV' ? 'USD a tasa BCV' : selected?.preferred_currency}.
              El valor fiat, USDT y BCV se guardará usando las tasas actuales.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="loan-repayment-amount">Monto del abono</Label>
              <Input
                id="loan-repayment-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  const sanitized = sanitizeAmountInput(event.target.value);
                  if (sanitized != null) setAmount(sanitized);
                }}
                min="0"
                step="0.01"
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
          <DrawerFooter>
            <DrawerClose
              render={
                <Button variant="outline" className="h-11" disabled={submitting}>
                  Cancelar
                </Button>
              }
            />
            <Button className="h-11" onClick={submitRepayment} disabled={submitting}>
              {submitting ? 'Guardando…' : 'Registrar abono'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
