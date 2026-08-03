'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRightLeft, Ban, ChevronRight, HandCoins, Link2, RotateCcw, Tag, TriangleAlert, Wallet } from 'lucide-react';
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
import { adminService } from '@/services/adminService';
import { cn } from '@/lib/utils';
import { formatAmountForInput, formatCaracasDateTime, formatNumber, sanitizeAmountInput } from '@/utils/functions';
import { CurrencyType, type CurrencyData } from '@/types/admin';
import type { OrphanAction, UnlinkPreview } from '@/types/operation';
import { UnlinkOrphanDialog } from './UnlinkOrphanDialog';
import type { LoanPreferredValue, LoanValuation, PaymentData, PaymentSuggestion } from '@/types/payment';
import { LinkOperationPanel } from './LinkOperationPanel';

interface OutgoingPaymentActionDialogProps {
  payment: PaymentData | null;
  onClose: () => void;
  onDone: () => void;
  onConverted: (payment: PaymentData) => void;
}

type Step = 'choose' | 'personal' | 'irrelevant' | 'operation' | 'loan';

export function OutgoingPaymentActionDialog({ payment, onClose, onDone, onConverted }: OutgoingPaymentActionDialogProps) {
  const [step, setStep] = useState<Step>('choose');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Marcar personal/irrelevante desvincula: si deja la op sin comprobantes, este cuadro decide.
  const [orphan, setOrphan] = useState<UnlinkPreview | null>(null);
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyData[]>([]);
  const [paymentCurrency, setPaymentCurrency] = useState('VES');
  const [fiatCurrency, setFiatCurrency] = useState('VES');
  const [fiatAmount, setFiatAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [bcvAmount, setBcvAmount] = useState('');
  const [preferredValue, setPreferredValue] = useState<LoanPreferredValue>('FIAT');
  const [loanNotes, setLoanNotes] = useState('');
  const [valuation, setValuation] = useState<LoanValuation | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [valuationError, setValuationError] = useState<string | null>(null);
  // Operación que el matcher propone: se muestra dentro de la opción "vincular", para que
  // clasificar no obligue a abrir el buscador solo para comprobar qué hay al otro lado.
  const [suggestion, setSuggestion] = useState<PaymentSuggestion | null>(null);

  useEffect(() => {
    setStep('choose');
    setDesc('');
    setSubmitting(false);
    setSuggestion(null);
    const paymentCurrency = (payment?.currency || '').toUpperCase();
    const normalizedCurrency = ['ZELLE', 'PAYPAL'].includes(paymentCurrency) ? 'USD' : paymentCurrency;
    setPaymentCurrency(paymentCurrency || 'VES');
    setFiatCurrency(normalizedCurrency && normalizedCurrency !== 'USDT' ? normalizedCurrency : 'VES');
    setFiatAmount(payment?.amount != null && paymentCurrency !== 'USDT' ? formatAmountForInput(payment.amount) : '');
    setUsdtAmount(payment?.amount != null && paymentCurrency === 'USDT' ? formatAmountForInput(payment.amount) : '');
    setBcvAmount('');
    setPreferredValue(paymentCurrency === 'USDT' ? 'USDT' : 'FIAT');
    setLoanNotes('');
    setValuation(null);
    setValuationLoading(false);
    setValuationError(null);

    if (!payment || payment.operation_uuid || payment.amount == null) return;
    let active = true;
    paymentService.getSuggestions('outgoing', [payment.id]).then((res) => {
      if (active && res.success && res.data) setSuggestion(res.data.items[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, [payment]);

  useEffect(() => {
    adminService.getCurrencyPairs(0, 100, true).then((res) => {
      if (!res.success || !res.data) return;
      const currencies = new Map<string, CurrencyData>();
      for (const pair of res.data.pairs) {
        for (const currency of [pair.from_currency, pair.to_currency]) {
          currencies.set(currency.symbol, currency);
        }
      }
      setAvailableCurrencies(Array.from(currencies.values()).sort((a, b) => a.symbol.localeCompare(b.symbol)));
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

  const applyValuation = (data: LoanValuation) => {
    setValuation(data);
    if (data.detected_currency) setPaymentCurrency(data.detected_currency);
    setFiatCurrency(data.fiat_currency);
    setFiatAmount(formatAmountForInput(data.fiat_amount));
    setUsdtAmount(formatAmountForInput(data.usdt_amount));
    setBcvAmount(formatAmountForInput(data.bcv_amount));
  };

  const loadLoanValuation = async (
    currency = fiatCurrency,
    sourceCurrency = paymentCurrency,
  ) => {
    if (isLoan) return;
    setValuationLoading(true);
    setValuationError(null);
    const result = await paymentService.getLoanValuation(
      payment.id,
      currency.trim().toUpperCase(),
      sourceCurrency.trim().toUpperCase(),
    );
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

  const fiatCurrencies = availableCurrencies.filter(
    (currency) => currency.currency_type === CurrencyType.FIAT,
  );
  const fiatCurrencySymbols = Array.from(
    new Set([fiatCurrency, ...fiatCurrencies.map((currency) => currency.symbol)]),
  ).filter((symbol) => symbol && symbol !== 'USDT');
  const paymentCurrencySymbols = Array.from(
    new Set([paymentCurrency, 'VES', 'USDT', ...availableCurrencies.map((currency) => currency.symbol)]),
  ).filter(Boolean);

  const convertToIncoming = async () => {
    setSubmitting(true);
    const res = await paymentService.convertToIncoming(payment.id);
    setSubmitting(false);
    if (res.success && res.data) {
      toast.success('Pago convertido en entrante');
      onConverted(res.data);
      onClose();
    } else {
      toast.error(res.error || 'No se pudo convertir el pago en entrante');
    }
  };

  // Marcar personal/irrelevante desvincula el pago: si era el único de su operación, hay
  // que decidir antes qué pasa con ella (mismo cuadro que al desvincular a mano).
  const needsOrphanDecision = async () => {
    if (!payment.operation_uuid) return false;
    const preview = await paymentService.unlinkPreview('outgoing', payment.id);
    if (preview.success && preview.data?.would_orphan) {
      setOrphan(preview.data);
      return true;
    }
    return false;
  };

  const savePersonal = async (orphanDecision?: { action: OrphanAction; note: string | null }) => {
    const value = desc.trim();
    if (!value) {
      toast.error('La descripción del gasto personal es requerida');
      return;
    }
    setSubmitting(true);
    if (!orphanDecision && (await needsOrphanDecision())) {
      setSubmitting(false);
      return;
    }
    const res = await paymentService.markPersonalExpense(
      payment.id,
      true,
      value,
      orphanDecision ?? undefined,
    );
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago marcado como gasto personal');
      setOrphan(null);
      finish();
    } else {
      toast.error(res.error || 'No se pudo marcar el gasto personal');
    }
  };

  const saveIrrelevant = async (orphanDecision?: { action: OrphanAction; note: string | null }) => {
    setSubmitting(true);
    if (!orphanDecision && (await needsOrphanDecision())) {
      setSubmitting(false);
      return;
    }
    const res = await paymentService.markIrrelevant(
      payment.id,
      true,
      desc.trim() || null,
      orphanDecision ?? undefined,
    );
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago marcado como irrelevante');
      setOrphan(null);
      finish();
    } else {
      toast.error(res.error || 'No se pudo marcar como irrelevante');
    }
  };

  const saveLoan = async () => {
    const fiat = Number.parseFloat(fiatAmount.replace(',', '.'));
    const usdt = Number.parseFloat(usdtAmount.replace(',', '.'));
    const bcv = bcvAmount.trim() ? Number.parseFloat(bcvAmount.replace(',', '.')) : null;
    if (!paymentCurrency) return toast.error('Confirma la moneda del monto detectado');
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
      paymentCurrency,
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

  /**
   * Opción de clasificación. La activa —la que el pago YA es— lleva anillo y el icono
   * teñido, para que al abrir se vea de un golpe en qué estado está sin leer las cinco.
   */
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
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:opacity-60',
        'bg-card',
        active ? 'border-primary ring-3 ring-primary/10' : 'border-border hover:bg-muted/50',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-foreground">{title}</span>
        <span className="block truncate text-[11.5px] text-muted-foreground">{description}</span>
      </span>
      <ChevronRight
        className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
      />
    </button>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          // `bg-background` (crema) y no el blanco por defecto del popover: el diseño apila
          // dos superficies —lienzo crema, tarjetas blancas— y con las dos en blanco las
          // filas se aplanan y la pantalla pierde toda la profundidad del mockup.
          'flex max-h-[85vh] flex-col overflow-hidden bg-background',
          step === 'loan' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        {step === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle>¿Qué es este pago saliente?</DialogTitle>
            </DialogHeader>

            {/* Con qué se está decidiendo: el comprobante, sin salir del cuadro. */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {payment.amount != null ? formatNumber(payment.amount) : '—'}{' '}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {payment.currency ?? ''}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    payment.bank_to || payment.bank_from || payment.provider,
                    payment.account_number || payment.phone_to,
                    payment.identification,
                    formatCaracasDateTime(payment.created_at),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Saliente
              </span>
            </div>

            <div className="space-y-2">
              <ChoiceButton
                icon={Link2}
                title="Pago de una operación"
                description={
                  suggestion
                    ? `Sugerida: ${[suggestion.from_currency, suggestion.to_currency]
                        .filter(Boolean)
                        .join('→')}${
                        suggestion.to_amount != null ? ` · ${formatNumber(suggestion.to_amount)}` : ''
                      }`
                    : 'Asociar el pago a una cotización del cliente.'
                }
                active={current === 'operation'}
                onClick={goOperation}
              />
              <ChoiceButton
                icon={HandCoins}
                title="Préstamo al cliente"
                description={isLoan ? 'Este pago ya originó un préstamo.' : 'Dinero que el cliente devuelve; se indexa a una referencia.'}
                active={current === 'loan'}
                onClick={openLoan}
              />
              <ChoiceButton
                icon={Wallet}
                title="Gasto personal"
                description="Pago propio del operador · requiere descripción."
                active={current === 'personal'}
                onClick={() => {
                  setDesc(payment.personal_description ?? '');
                  setStep('personal');
                }}
              />
              <ChoiceButton
                icon={Ban}
                title="Irrelevante"
                description="Duplicado o ajeno a la operación."
                active={current === 'irrelevant'}
                onClick={() => {
                  setDesc(payment.irrelevant_description ?? '');
                  setStep('irrelevant');
                }}
              />
              <ChoiceButton
                icon={ArrowRightLeft}
                title="Convertir en entrante"
                description="El bot lo clasificó al revés."
                active={false}
                onClick={convertToIncoming}
              />
            </div>
            <DialogFooter className="sm:justify-between">
              {/* La consecuencia, donde se decide: marcar personal o irrelevante desvincula. */}
              <span className="text-xs text-muted-foreground">
                Marcar como personal o irrelevante desvincula la operación.
              </span>
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
                <div className="grid gap-3 rounded-lg bg-muted/60 p-3 sm:grid-cols-[1fr_220px] sm:items-end">
                  <div>
                    <span className="text-sm text-muted-foreground">Valor detectado en el comprobante</span>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatNumber(valuation?.detected_amount ?? payment.amount ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {valuation
                        ? `Conversiones según las tasas registradas al ${formatCaracasDateTime(valuation.valuation_at)}.`
                        : 'Las conversiones se calculan usando la fecha y hora de este pago.'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loan-payment-currency">Moneda del monto detectado</Label>
                    <Select
                      value={paymentCurrency}
                      onValueChange={(value) => {
                        if (!value) return;
                        setPaymentCurrency(value);
                        setValuation(null);
                        const selected = availableCurrencies.find((currency) => currency.symbol === value);
                        const isFiat = selected?.currency_type === CurrencyType.FIAT || value === 'VES';
                        const nextFiat = isFiat ? value : fiatCurrency;
                        if (isFiat) {
                          setFiatCurrency(value);
                          if (preferredValue === 'BCV' && value !== 'VES') setPreferredValue('FIAT');
                          if (value !== 'VES') setBcvAmount('');
                        }
                        void loadLoanValuation(nextFiat, value);
                      }}
                    >
                      <SelectTrigger id="loan-payment-currency" className="h-10 w-full">
                        <SelectValue placeholder="Confirma la moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentCurrencySymbols.map((symbol) => {
                          const currency = availableCurrencies.find((item) => item.symbol === symbol);
                          return (
                            <SelectItem key={symbol} value={symbol}>
                              {symbol}{currency?.name ? ` · ${currency.name}` : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {!payment.currency ? (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        El OCR no guardó la moneda. Confírmala antes de registrar el préstamo.
                      </p>
                    ) : null}
                  </div>
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

                {/* Tres botones y no un desplegable: es la decisión que fija en qué unidad
                    queda la deuda, y determina cuánto acabará pagando el cliente. Escondida
                    tras un select se elige sin mirarla. */}
                <div className="space-y-1.5">
                  <Label>Referencia para llevar la deuda</Label>
                  <div className="flex gap-2" role="group" aria-label="Referencia para llevar la deuda">
                    {(
                      [
                        ['FIAT', `Moneda fiat${fiatCurrency ? ` (${fiatCurrency})` : ''}`],
                        ['USDT', 'USDT'],
                        ['BCV', 'USD a tasa BCV'],
                      ] as const
                    )
                      .filter(([value]) => value !== 'BCV' || fiatCurrency.trim().toUpperCase() === 'VES')
                      .map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPreferredValue(value as LoanPreferredValue)}
                          aria-pressed={preferredValue === value}
                          className={cn(
                            'min-h-11 flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                            preferredValue === value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-card text-foreground hover:bg-muted/50',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                  </div>
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
                      className={cn(preferredValue === 'FIAT' && 'border-primary ring-3 ring-primary/10')}
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
                      className={cn(preferredValue === 'USDT' && 'border-primary ring-3 ring-primary/10')}
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
                      className={cn(preferredValue === 'BCV' && 'border-primary ring-3 ring-primary/10')}
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
                    onClick={() => loadLoanValuation(fiatCurrency, paymentCurrency)}
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
                onClick={() => (step === 'personal' ? savePersonal() : saveIrrelevant())}
                disabled={submitting || (step === 'personal' && desc.trim() === '')}
              >
                <Tag className="h-4 w-4" />
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      <UnlinkOrphanDialog
        preview={orphan}
        submitting={submitting}
        onCancel={() => setOrphan(null)}
        onDecide={(action, note) =>
          step === 'personal'
            ? savePersonal({ action, note })
            : saveIrrelevant({ action, note })
        }
      />
    </Dialog>
  );
}
