'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Ban, ChevronRight, HandCoins, Link2, RotateCcw, Tag, TriangleAlert, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
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
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { paymentService } from '@/services/paymentService';
import { fundService } from '@/services/fundService';
import { adminService } from '@/services/adminService';
import { cn } from '@/lib/utils';
import { formatAmountForInput, formatCaracasDateTime, formatNumber, sanitizeAmountInput } from '@/utils/functions';
import { CurrencyType, type CurrencyData } from '@/types/admin';
import type { LoanPreferredValue, LoanValuation, PaymentData } from '@/types/payment';
import type { FundGroup } from '@/types/fund';
import { LinkOperationPanel } from './LinkOperationPanel';

interface OutgoingPaymentActionDialogProps {
  payment: PaymentData | null;
  onClose: () => void;
  onDone: () => void;
}

type Step = 'choose' | 'personal' | 'irrelevant' | 'operation' | 'group' | 'loan';

export function OutgoingPaymentActionDialog({ payment, onClose, onDone }: OutgoingPaymentActionDialogProps) {
  const [step, setStep] = useState<Step>('choose');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [fiatCurrencies, setFiatCurrencies] = useState<CurrencyData[]>([]);
  const [groupUuid, setGroupUuid] = useState('');
  const [fiatCurrency, setFiatCurrency] = useState('VES');
  const [fiatAmount, setFiatAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [bcvAmount, setBcvAmount] = useState('');
  const [preferredValue, setPreferredValue] = useState<LoanPreferredValue>('FIAT');
  const [loanNotes, setLoanNotes] = useState('');
  const [valuation, setValuation] = useState<LoanValuation | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [valuationError, setValuationError] = useState<string | null>(null);

  useEffect(() => {
    setStep('choose');
    setDesc('');
    setSubmitting(false);
    setGroupUuid('');
    const paymentCurrency = (payment?.currency || '').toUpperCase();
    const normalizedCurrency = ['ZELLE', 'PAYPAL'].includes(paymentCurrency) ? 'USD' : paymentCurrency;
    setFiatCurrency(normalizedCurrency && normalizedCurrency !== 'USDT' ? normalizedCurrency : 'VES');
    setFiatAmount(payment?.amount != null && paymentCurrency !== 'USDT' ? formatAmountForInput(payment.amount) : '');
    setUsdtAmount(payment?.amount != null && paymentCurrency === 'USDT' ? formatAmountForInput(payment.amount) : '');
    setBcvAmount('');
    setPreferredValue(paymentCurrency === 'USDT' ? 'USDT' : 'FIAT');
    setLoanNotes('');
    setValuation(null);
    setValuationLoading(false);
    setValuationError(null);
  }, [payment]);

  useEffect(() => {
    fundService.getGroups().then((res) => {
      if (res.success && res.data) setGroups(res.data.filter((g) => g.is_active));
    });
    adminService.getCurrencyPairs(0, 100, true).then((res) => {
      if (!res.success || !res.data) return;
      const currencies = new Map<string, CurrencyData>();
      for (const pair of res.data.pairs) {
        for (const currency of [pair.from_currency, pair.to_currency]) {
          if (currency.currency_type === CurrencyType.FIAT) currencies.set(currency.symbol, currency);
        }
      }
      setFiatCurrencies(Array.from(currencies.values()).sort((a, b) => a.symbol.localeCompare(b.symbol)));
    });
  }, []);

  if (!payment) return null;

  const isPersonal = !!payment.is_personal_expense;
  const isIrrelevant = !!payment.is_irrelevant;
  const isLoan = !!payment.loan;
  const current: Step = isLoan ? 'loan' : isPersonal ? 'personal' : isIrrelevant ? 'irrelevant' : 'operation';

  const finish = () => {
    onDone();
    onClose();
  };

  // Limpia la marca actual (si la hay) y pasa al selector de operaciones (revertir a operativo).
  const goOperation = async () => {
    if (isPersonal || isIrrelevant) {
      setSubmitting(true);
      const res = isPersonal
        ? await paymentService.markPersonalExpense(payment.id, false, null)
        : await paymentService.markIrrelevant(payment.id, false, null);
      setSubmitting(false);
      if (!res.success) {
        toast.error(res.error || 'No se pudo actualizar el pago');
        return;
      }
      onDone(); // refresca la lista en segundo plano; el diálogo sigue abierto
    }
    setStep('operation');
  };

  // Abre el paso de grupo, preseleccionando el fondo cuyo JID coincide con el destino del pago.
  const openGroup = () => {
    const match = groups.find((g) => g.whatsapp_group_jid && g.whatsapp_group_jid === payment.client_phone);
    setGroupUuid(match?.uuid ?? '');
    setStep('group');
  };

  const applyValuation = (data: LoanValuation) => {
    setValuation(data);
    setFiatCurrency(data.fiat_currency);
    setFiatAmount(formatAmountForInput(data.fiat_amount));
    setUsdtAmount(formatAmountForInput(data.usdt_amount));
    setBcvAmount(formatAmountForInput(data.bcv_amount));
  };

  const loadLoanValuation = async (currency = fiatCurrency) => {
    if (isLoan) return;
    setValuationLoading(true);
    setValuationError(null);
    const result = await paymentService.getLoanValuation(payment.id, currency.trim().toUpperCase());
    setValuationLoading(false);
    if (result.success && result.data) {
      applyValuation(result.data);
      return;
    }
    setValuationError(result.error || 'No se pudieron consultar las tasas históricas');
  };

  const openLoan = () => {
    setStep('loan');
    if (!isLoan && !valuation) loadLoanValuation();
  };

  const setAmountWithTwoDecimals = (
    setter: (value: string) => void,
    value: string,
  ) => {
    const sanitized = sanitizeAmountInput(value);
    if (sanitized != null) setter(sanitized);
  };

  const fiatCurrencySymbols = Array.from(
    new Set([fiatCurrency, ...fiatCurrencies.map((currency) => currency.symbol)]),
  ).filter((symbol) => symbol && symbol !== 'USDT');

  const saveGroup = async () => {
    if (!groupUuid) {
      toast.error('Selecciona el grupo');
      return;
    }
    setSubmitting(true);
    const res = await paymentService.toGroupIncoming(payment.id, { groupUuid });
    setSubmitting(false);
    if (res.success) {
      toast.success('Contabilizado como entrante del grupo. Ahora puedes anexarle el pago en Bs.');
      finish();
    } else {
      toast.error(res.error || 'No se pudo contabilizar en el grupo');
    }
  };

  const savePersonal = async () => {
    const value = desc.trim();
    if (!value) {
      toast.error('La descripción del gasto personal es requerida');
      return;
    }
    setSubmitting(true);
    const res = await paymentService.markPersonalExpense(payment.id, true, value);
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago marcado como gasto personal');
      finish();
    } else {
      toast.error(res.error || 'No se pudo marcar el gasto personal');
    }
  };

  const saveIrrelevant = async () => {
    setSubmitting(true);
    const res = await paymentService.markIrrelevant(payment.id, true, desc.trim() || null);
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago marcado como irrelevante');
      finish();
    } else {
      toast.error(res.error || 'No se pudo marcar como irrelevante');
    }
  };

  const saveLoan = async () => {
    const fiat = Number.parseFloat(fiatAmount.replace(',', '.'));
    const usdt = Number.parseFloat(usdtAmount.replace(',', '.'));
    const bcv = bcvAmount.trim() ? Number.parseFloat(bcvAmount.replace(',', '.')) : null;
    if (!Number.isFinite(fiat) || fiat <= 0) return toast.error('Indica un valor fiat válido');
    if (!Number.isFinite(usdt) || usdt <= 0) return toast.error('Indica un valor USDT válido');
    if (!fiatCurrency.trim() || fiatCurrency.trim().toUpperCase() === 'USDT') {
      return toast.error('Indica la moneda fiat del préstamo');
    }
    if (preferredValue === 'BCV' && fiatCurrency.trim().toUpperCase() !== 'VES') {
      return toast.error('BCV solo está disponible para préstamos expresados en VES');
    }
    if (fiatCurrency.trim().toUpperCase() === 'VES' && (bcv == null || !Number.isFinite(bcv) || bcv <= 0)) {
      return toast.error('Indica un valor BCV válido');
    }

    setSubmitting(true);
    const res = await paymentService.createLoan(payment.id, {
      preferredValue,
      fiatCurrency: fiatCurrency.trim().toUpperCase(),
      fiatAmount: fiat,
      usdtAmount: usdt,
      bcvAmount: bcv,
      notes: loanNotes.trim() || null,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success('Préstamo registrado al cliente');
      finish();
    } else {
      toast.error(res.error || 'No se pudo registrar el préstamo');
    }
  };

  const ChoiceButton = ({
    icon: Icon,
    title,
    description,
    active,
    onClick,
  }: {
    icon: typeof Link2;
    title: string;
    description: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:opacity-60 ${
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      }`}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'flex max-h-[85vh] flex-col',
          step === 'loan' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        {step === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle>¿Qué quieres hacer con este pago?</DialogTitle>
              <DialogDescription>
                Clasifica el pago saliente antes de vincularlo a una operación.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <ChoiceButton
                icon={Link2}
                title="Vincular a una operación"
                description="Asociar el pago a una cotización del cliente."
                active={current === 'operation'}
                onClick={goOperation}
              />
              <ChoiceButton
                icon={Wallet}
                title="Gasto personal"
                description="Pago propio del operador (requiere descripción)."
                active={current === 'personal'}
                onClick={() => {
                  setDesc(payment.personal_description ?? '');
                  setStep('personal');
                }}
              />
              <ChoiceButton
                icon={HandCoins}
                title="Préstamo al cliente"
                description={isLoan ? 'Este pago ya originó un préstamo.' : 'Registra el pago como dinero que el cliente debe devolver.'}
                active={current === 'loan'}
                onClick={openLoan}
              />
              <ChoiceButton
                icon={Ban}
                title="Irrelevante"
                description="No corresponde a ninguna operación (descripción opcional)."
                active={current === 'irrelevant'}
                onClick={() => {
                  setDesc(payment.irrelevant_description ?? '');
                  setStep('irrelevant');
                }}
              />
              <ChoiceButton
                icon={Users}
                title="Contabilizar como entrante del grupo"
                description="Zelle reenviado al grupo: pásalo al lado entrante para luego anexar el Bs."
                active={false}
                onClick={openGroup}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
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
              table="outgoing"
              onSuccess={finish}
              onCancel={() => setStep('choose')}
              cancelLabel="Volver"
            />
          </>
        ) : step === 'group' ? (
          <>
            <DialogHeader>
              <DialogTitle>Contabilizar como entrante del grupo</DialogTitle>
              <DialogDescription>
                El Zelle pasa al lado <strong>entrante</strong> marcado “Contabilizado · grupo” y deja de
                ocupar el lado saliente. Después podrás crear la operación desde él y anexarle el Bs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="payment-group">Grupo (fondo)</Label>
              <Select value={groupUuid} onValueChange={(v) => setGroupUuid(v ?? '')}>
                <SelectTrigger id="payment-group" className="h-10 w-full">
                  <SelectValue placeholder="Selecciona el grupo" />
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
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => setStep('choose')} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button onClick={saveGroup} disabled={submitting || !groupUuid}>
                <Users className="h-4 w-4" />
                {submitting ? 'Guardando…' : 'Contabilizar'}
              </Button>
            </DialogFooter>
          </>
        ) : step === 'loan' ? (
          <>
            <DialogHeader>
              <DialogTitle>{isLoan ? 'Préstamo registrado' : 'Registrar préstamo al cliente'}</DialogTitle>
              <DialogDescription>
                {isLoan
                  ? 'El pago ya está clasificado como préstamo. Su saldo se gestiona desde el perfil del cliente.'
                  : 'Se guardarán el valor fiat, USDT y, cuando la fiat sea VES, el equivalente BCV.'}
              </DialogDescription>
            </DialogHeader>

            {isLoan && payment.loan ? (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Principal</span>
                  <span className="text-sm font-semibold text-foreground">
                    {payment.loan.principal_amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    {payment.loan.preferred_currency === 'USD_BCV' ? 'USD (BCV)' : payment.loan.preferred_currency}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Pendiente</span>
                  <span className="text-sm font-semibold text-foreground">
                    {payment.loan.outstanding_amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    {payment.loan.preferred_currency === 'USD_BCV' ? 'USD (BCV)' : payment.loan.preferred_currency}
                  </span>
                </div>
              </div>
            ) : (
              <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Valor detectado en el comprobante</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatNumber(valuation?.detected_amount ?? payment.amount ?? 0)}{' '}
                      {valuation?.detected_currency || payment.currency || '—'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {valuation
                      ? `Conversiones según las tasas registradas al ${formatCaracasDateTime(valuation.valuation_at)}.`
                      : 'Las conversiones se calculan usando la fecha y hora de este pago.'}
                  </p>
                </div>

                {valuationLoading ? (
                  <p className="text-sm text-muted-foreground">Consultando tasas históricas…</p>
                ) : null}
                {valuationError ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                    {valuationError}. Puedes completar los tres valores manualmente.
                  </div>
                ) : null}
                {valuation?.warnings.map((warning) => (
                  <p key={warning} className="text-xs text-amber-700 dark:text-amber-400">{warning}</p>
                ))}

                <div className="space-y-1.5">
                  <Label htmlFor="loan-preferred-value">Referencia para llevar la deuda</Label>
                  <Select
                    value={preferredValue}
                    onValueChange={(value) => setPreferredValue((value as LoanPreferredValue) ?? 'FIAT')}
                  >
                    <SelectTrigger id="loan-preferred-value" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIAT">Moneda fiat</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      {fiatCurrency.trim().toUpperCase() === 'VES' ? <SelectItem value="BCV">USD a tasa BCV</SelectItem> : null}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Esta referencia determina la unidad en la que se llevará el saldo pendiente.
                  </p>
                </div>

                {preferredValue !== 'FIAT' ? (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200"
                  >
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm">
                      La deuda quedará indexada a {preferredValue === 'BCV' ? 'USD a tasa BCV' : 'USDT'}.
                      El valor en {fiatCurrency || 'fiat'} a cobrar cambiará según la tasa del día de cada abono.
                    </p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="loan-fiat-amount">Valor fiat ({fiatCurrency || '—'})</Label>
                    <Input
                      id="loan-fiat-amount"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={fiatAmount}
                      onChange={(event) => setAmountWithTwoDecimals(setFiatAmount, event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loan-usdt-amount">Equivalente USDT</Label>
                    <Input
                      id="loan-usdt-amount"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={usdtAmount}
                      onChange={(event) => setAmountWithTwoDecimals(setUsdtAmount, event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loan-bcv-amount">Equivalente USD (BCV)</Label>
                    <Input
                      id="loan-bcv-amount"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={bcvAmount}
                      onChange={(event) => setAmountWithTwoDecimals(setBcvAmount, event.target.value)}
                      placeholder={fiatCurrency === 'VES' ? '0.00' : 'No aplica'}
                      disabled={fiatCurrency !== 'VES'}
                    />
                  </div>
                </div>

                {valuation?.usdt_rate != null || valuation?.bcv_rate != null ? (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {valuation.usdt_rate != null ? (
                      <p>
                        1 USDT = {formatNumber(valuation.usdt_rate)} {valuation.fiat_currency}
                        {valuation.usdt_rate_at ? ` · tasa registrada ${formatCaracasDateTime(valuation.usdt_rate_at)}` : ''}
                      </p>
                    ) : null}
                    {valuation.bcv_rate != null ? (
                      <p>
                        1 USD (BCV) = {formatNumber(valuation.bcv_rate)} VES
                        {valuation.bcv_rate_at ? ` · tasa registrada ${formatCaracasDateTime(valuation.bcv_rate_at)}` : ''}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="loan-fiat-currency">Moneda fiat de pago</Label>
                    <Select
                      value={fiatCurrency}
                      onValueChange={(value) => {
                        if (!value) return;
                        setFiatCurrency(value);
                        if (preferredValue === 'BCV' && value !== 'VES') setPreferredValue('FIAT');
                        if (value !== 'VES') setBcvAmount('');
                        void loadLoanValuation(value);
                      }}
                    >
                      <SelectTrigger id="loan-fiat-currency" className="h-10 w-full">
                        <SelectValue placeholder="Selecciona una moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {fiatCurrencySymbols.map((symbol) => {
                          const currency = fiatCurrencies.find((item) => item.symbol === symbol);
                          return (
                            <SelectItem key={symbol} value={symbol}>
                              {symbol}{currency?.name ? ` · ${currency.name}` : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadLoanValuation(fiatCurrency)}
                    disabled={valuationLoading}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar conversión
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Los tres valores son editables. Si corriges alguno, se guardará el monto manual y la tasa implícita correspondiente.
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="loan-notes">Nota (opcional)</Label>
                  <Textarea
                    id="loan-notes"
                    value={loanNotes}
                    onChange={(event) => setLoanNotes(event.target.value)}
                    placeholder="Condiciones o motivo del préstamo"
                    rows={2}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => setStep('choose')} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              {isLoan && payment.client_uuid ? (
                <Link
                  href={`/admin/clients/${payment.client_uuid}`}
                  className={cn(buttonVariants({ variant: 'default' }))}
                >
                  Ver préstamos del cliente
                </Link>
              ) : (
                <Button onClick={saveLoan} disabled={submitting}>
                  <HandCoins className="h-4 w-4" />
                  {submitting ? 'Guardando…' : 'Registrar préstamo'}
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {step === 'personal' ? 'Gasto personal' : 'Marcar como irrelevante'}
              </DialogTitle>
              <DialogDescription>
                {step === 'personal'
                  ? 'Describe el gasto personal. La descripción es requerida.'
                  : 'Puedes añadir una descripción opcional del motivo.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="payment-action-desc">
                Descripción {step === 'irrelevant' ? '(opcional)' : ''}
              </Label>
              <Textarea
                id="payment-action-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={
                  step === 'personal'
                    ? 'Ej: Pago de servicio personal, recarga, etc.'
                    : 'Ej: Comprobante duplicado, no corresponde…'
                }
                rows={3}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => setStep('choose')} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button
                onClick={step === 'personal' ? savePersonal : saveIrrelevant}
                disabled={submitting || (step === 'personal' && desc.trim() === '')}
              >
                <Tag className="h-4 w-4" />
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
