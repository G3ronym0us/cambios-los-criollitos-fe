'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRightLeft, Ban, ChevronRight, HandCoins, Info, Link2, RotateCcw, ScanLine, Tag, TriangleAlert, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import {
  SidePanel,
  SidePanelBody,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from '@/components/shared/SidePanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { paymentService } from '@/services/paymentService';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { cn } from '@/lib/utils';
import { formatAmountForInput, formatCaracasDateTime, formatNumber, isUnassignedClientPhone } from '@/utils/functions';
import { CurrencyType, type CurrencyData } from '@/types/admin';
import type { OrphanAction, UnlinkPreview } from '@/types/operation';
import { UnlinkOrphanDialog } from './UnlinkOrphanDialog';
import { CorrectReceiptDialog } from './CorrectReceiptDialog';
import { describeCorrection } from './paymentRowData';
import type { LoanPreferredValue, LoanValuation, PaymentData, PaymentSuggestion } from '@/types/payment';
import { LinkOperationPanel } from './LinkOperationPanel';
import { LoanReferenceFields } from '@/components/loans/LoanReferenceFields';

interface OutgoingPaymentActionDialogProps {
  payment: PaymentData | null;
  onClose: () => void;
  onDone: () => void;
  onConverted: (payment: PaymentData) => void;
}

/**
 * Título y subtítulo de cada paso, en la CABECERA del cajón junto a la ficha del
 * comprobante. Antes cada paso repetía su encabezado dentro del cuerpo y el resumen de a
 * quién se pagó se perdía al bajar.
 */
const STEP_META: Record<
  Exclude<Step, 'choose'>,
  { title: (isLoan: boolean) => string; subtitle: (isLoan: boolean) => string }
> = {
  operation: {
    title: () => 'Vincular a operación',
    subtitle: () => 'Elige la cotización a la que pertenece este comprobante.',
  },
  loan: {
    title: (isLoan) => (isLoan ? 'Préstamo registrado' : 'Registrar préstamo al cliente'),
    subtitle: (isLoan) =>
      isLoan
        ? 'El pago ya está clasificado como préstamo. Su saldo se gestiona desde el perfil del cliente.'
        : 'Se guardan el valor fiat, el USDT y —si la fiat es VES— el equivalente BCV.',
  },
  personal: {
    title: () => 'Marcar como gasto personal',
    subtitle: () => 'Queda fuera de las operaciones. Describe de qué fue para el historial.',
  },
  irrelevant: {
    title: () => 'Marcar como irrelevante',
    subtitle: () => 'Duplicado o ajeno a las operaciones. Deja constancia del motivo.',
  },
};

/**
 * Con qué unidad se indexa la deuda por defecto.
 *
 * Nunca la fiat: un préstamo en bolívares llevado en bolívares se cobra devaluado. Donde hay
 * tasa oficial manda el BCV —que es lo que el cliente reconoce como "dólares"—, y el backend
 * solo lo admite para VES; en cualquier otro par la referencia es USDT.
 */
function defaultLoanReference(paymentCurrency: string, fiatCurrency: string): LoanPreferredValue {
  if (paymentCurrency === 'USDT') return 'USDT';
  return fiatCurrency === 'VES' ? 'BCV' : 'USDT';
}

type Step = 'choose' | 'personal' | 'irrelevant' | 'operation' | 'loan';

export function OutgoingPaymentActionDialog({ payment, onClose, onDone, onConverted }: OutgoingPaymentActionDialogProps) {
  const [step, setStep] = useState<Step>('choose');
  // Cabecera que un sub-paso hijo (la revisión de la diferencia al crear una operación)
  // toma prestada mientras dura. `null` = la del paso actual.
  const [stepHeader, setStepHeader] = useState<{ title: string; eyebrow: string } | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [correcting, setCorrecting] = useState(false);
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
  // A nombre de quién queda el préstamo cuando el comprobante se mandó a un grupo: el
  // teléfono del pago no identifica al deudor y hay que elegirlo a mano.
  const [borrowerUuid, setBorrowerUuid] = useState<string | null>(null);
  const [borrowerOptions, setBorrowerOptions] = useState<{ uuid: string; label: string }[]>([]);

  useEffect(() => {
    setStep('choose');
    setStepHeader(null);
    setShowRawText(false);
    setCorrecting(false);
    setDesc('');
    setSubmitting(false);
    setSuggestion(null);
    const paymentCurrency = (payment?.currency || '').toUpperCase();
    const normalizedCurrency = ['ZELLE', 'PAYPAL'].includes(paymentCurrency) ? 'USD' : paymentCurrency;
    const nextFiat = normalizedCurrency && normalizedCurrency !== 'USDT' ? normalizedCurrency : 'VES';
    setPaymentCurrency(paymentCurrency || 'VES');
    setFiatCurrency(nextFiat);
    setFiatAmount(payment?.amount != null && paymentCurrency !== 'USDT' ? formatAmountForInput(payment.amount) : '');
    setUsdtAmount(payment?.amount != null && paymentCurrency === 'USDT' ? formatAmountForInput(payment.amount) : '');
    setBcvAmount('');
    setPreferredValue(defaultLoanReference(paymentCurrency, nextFiat));
    setLoanNotes('');
    setValuation(null);
    setValuationLoading(false);
    setValuationError(null);
    setBorrowerUuid(null);
    setBorrowerOptions([]);

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

  // Cuando el comprobante se mandó a un grupo, el teléfono no dice a quién se le prestó:
  // hay que elegir el deudor. Se ofrecen los clientes con identidad conocida.
  useEffect(() => {
    if (step !== 'loan' || !valuation?.requires_borrower) return;
    let cancelled = false;
    void clientService.getClients({ limit: 500 }).then((result) => {
      if (cancelled || !result.success || !result.data) return;
      const items = result.data.items
        .filter((item) => !isUnassignedClientPhone(item.phone))
        .map((item) => ({
          uuid: item.uuid,
          label: item.display_name || item.phone,
        }));
      setBorrowerOptions(items);
    });
    return () => {
      cancelled = true;
    };
  }, [step, valuation?.requires_borrower]);

  if (!payment) return null;

  const isPersonal = !!payment.is_personal_expense;
  const isIrrelevant = !!payment.is_irrelevant;
  const isLoan = !!payment.loan;
  /**
   * Qué es YA este pago, o null si todavía no es nada.
   *
   * Antes caía en 'operation' por descarte, así que un saliente sin clasificar abría con el
   * anillo puesto en "Pago de una operación" — la misma señal que marca lo que el pago ya
   * es. Con la sugerencia del matcher en su propia insignia, el anillo tiene que decir la
   * verdad o las dos señales vuelven a confundirse.
   */
  const current: Step | null = isLoan
    ? 'loan'
    : isPersonal
      ? 'personal'
      : isIrrelevant
        ? 'irrelevant'
        : payment.operation_uuid
          ? 'operation'
          : null;

  /** A quién y por dónde salió: el mismo resumen en la portada y en la ficha de los pasos. */
  const receiptLine = [
    payment.bank_to || payment.bank_from || payment.provider,
    payment.account_number || payment.phone_to,
    payment.identification,
    formatCaracasDateTime(payment.created_at),
  ]
    .filter(Boolean)
    .join(' · ');

  const correction = describeCorrection(payment);

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
    if (data.suggested_client) setBorrowerUuid(data.suggested_client.uuid);
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
    if (valuation?.requires_borrower && !borrowerUuid) {
      return toast.error('Elige a nombre de quién queda el préstamo');
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
      clientUuid: borrowerUuid,
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
    suggested = false,
    onClick,
  }: {
    icon: typeof Link2;
    title: string;
    description: string;
    active: boolean;
    /** Lo que propone el matcher. Señal distinta de `active`: pueden no coincidir. */
    suggested?: boolean;
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
        <span className="flex items-center gap-1.5">
          <span className="text-[13.5px] font-semibold text-foreground">{title}</span>
          {suggested ? (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Sugerida
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[11.5px] text-muted-foreground">{description}</span>
      </span>
      <ChevronRight
        className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
      />
    </button>
  );

  return (
    <SidePanel
      open
      onOpenChange={(open) => !open && onClose()}
      // El préstamo pide tres importes en columna: ahí el cajón pasa al ancho grande.
      className={cn(step === 'loan' && 'sm:w-[min(31rem,100vw)]')}
    >
      <SidePanelHeader>
        {step === 'choose' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Saliente
              </span>
              <span className="font-mono text-[11.5px] text-muted-foreground">#{payment.id}</span>
            </div>
            <SidePanelTitle className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {payment.amount != null ? formatNumber(payment.amount) : '—'}{' '}
              <span className="text-base font-semibold text-muted-foreground">
                {payment.currency ?? ''}
              </span>
            </SidePanelTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{receiptLine}</p>
          </>
        ) : (
          <>
            {stepHeader ? (
              // Un sub-paso del alta de operación manda en la cabecera: el título es lo que
              // hay que decidir, y el comprobante de abajo se queda para poder decidirlo.
              <>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {stepHeader.eyebrow}
                </p>
                <SidePanelTitle className="mt-0.5 text-pretty text-base font-bold text-foreground">
                  {stepHeader.title}
                </SidePanelTitle>
              </>
            ) : (
              <>
                <SidePanelTitle className="text-base font-bold text-foreground">
                  {STEP_META[step].title(isLoan)}
                </SidePanelTitle>
                <p className="mt-0.5 text-pretty text-xs text-muted-foreground">
                  {STEP_META[step].subtitle(isLoan)}
                </p>
              </>
            )}
            <div className="mt-3 rounded-lg border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold tabular-nums text-foreground">
                  {payment.amount != null ? formatNumber(payment.amount) : '—'}{' '}
                  {payment.currency ?? ''}
                </span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Saliente
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                Comprobante #{payment.id} · {receiptLine}
              </p>
              {/* Si el monto de arriba lo puso una persona y no el OCR, hay que decirlo:
                  si no, un número corregido se lee como una lectura de la máquina. */}
              {correction ? (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                  Corregido a mano · el OCR había leído{' '}
                  <span className="line-through">{correction}</span>
                </p>
              ) : null}
            </div>
          </>
        )}
      </SidePanelHeader>

      {step === 'choose' ? (
        <>
        <SidePanelBody>
            {/* Cinco opciones planas se leían como cinco iguales, y no lo son: dos dejan el
                pago ligado a un cliente, dos lo sacan de toda operación y la última no es
                una clasificación sino un arreglo de la lectura del bot. */}
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Queda ligado a un cliente
              </span>
              <ChoiceButton
                icon={Link2}
                title="Pago de una operación"
                description={
                  suggestion
                    ? `Sugerida: ${[suggestion.from_currency, suggestion.to_currency]
                        .filter(Boolean)
                        .join('/')}${
                        suggestion.to_amount != null ? ` · ${formatNumber(suggestion.to_amount)}` : ''
                      }`
                    : 'Asociar el pago a una cotización del cliente.'
                }
                active={current === 'operation'}
                suggested={suggestion != null}
                onClick={goOperation}
              />
              <ChoiceButton
                icon={HandCoins}
                title="Préstamo al cliente"
                description={isLoan ? 'Este pago ya originó un préstamo.' : 'Dinero que el cliente devuelve; se indexa a una referencia.'}
                active={current === 'loan'}
                onClick={openLoan}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Sale de las operaciones
              </span>
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
              {/* La consecuencia, pegada a las dos opciones que la tienen. En el pie del
                  cajón se leía como una nota general y no se relacionaba con ninguna. */}
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="text-pretty">
                  Ambas dejan el comprobante fuera de toda operación. Si ya estaba vinculado, la
                  operación se queda sin este pago.
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Corregir la lectura del bot
              </span>
              <ChoiceButton
                icon={ScanLine}
                title="Corregir monto o referencia"
                description={
                  payment.corrected_at
                    ? 'Ya se corrigió a mano; puedes volver a ajustarlo.'
                    : 'El OCR leyó mal el comprobante.'
                }
                active={false}
                onClick={() => setCorrecting(true)}
              />
              <ChoiceButton
                icon={ArrowRightLeft}
                title="Convertir en entrante"
                description="Es dinero que entró, no que salió."
                active={false}
                onClick={convertToIncoming}
              />
              {/* Texto crudo del OCR: plegado, igual que en el cajón de entrantes. Cuando el
                  monto o el banco salieron mal, es lo único que dice POR QUÉ salieron mal. */}
              {payment.raw_text ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setShowRawText((v) => !v)}
                    aria-expanded={showRawText}
                    className="flex w-full items-center justify-between gap-2 bg-muted/60 px-3 py-2 text-left"
                  >
                    <span className="text-xs font-semibold text-foreground">
                      Texto detectado por el bot
                    </span>
                    <span className="text-[11px] font-semibold text-primary">
                      {showRawText ? 'Ocultar' : 'Ver'}
                    </span>
                  </button>
                  {showRawText ? (
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap bg-card px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {payment.raw_text}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
        </SidePanelBody>

        <SidePanelFooter>
          <span className="text-xs text-muted-foreground">
            Podrás cambiar la clasificación más adelante.
          </span>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
        </SidePanelFooter>
        </>
      ) : step === 'operation' ? (
        <LinkOperationPanel
          payment={payment}
          table="outgoing"
          onSuccess={finish}
          onCancel={() => setStep('choose')}
          cancelLabel="Volver"
          onHeaderChange={setStepHeader}
        />
      ) : step === 'loan' ? (
        <SidePanelBody>

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
              // Sin scroll propio: el cuerpo del cajón ya scrollea, y con dos barras el pie
              // del formulario se quedaba a mitad de camino.
              <div className="space-y-4">
                <div className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_170px] sm:items-end">
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Detectado en el comprobante
                    </span>
                    <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                      {formatNumber(valuation?.detected_amount ?? payment.amount ?? 0)}{' '}
                      <span className="text-sm font-semibold text-muted-foreground">
                        {paymentCurrency}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Comprobante #{payment.id} · {receiptLine}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loan-payment-currency">Moneda</Label>
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
                          if (preferredValue === 'BCV' && value !== 'VES') setPreferredValue('USDT');
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

                {valuation?.requires_borrower ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="loan-borrower">¿A nombre de quién queda el préstamo?</Label>
                    <Select
                      value={borrowerUuid ?? ''}
                      onValueChange={(value) => setBorrowerUuid(value || null)}
                    >
                      <SelectTrigger id="loan-borrower" className="h-10 w-full">
                        <SelectValue placeholder="Selecciona el deudor" />
                      </SelectTrigger>
                      <SelectContent>
                        {borrowerOptions.map((option) => (
                          <SelectItem key={option.uuid} value={option.uuid}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      El comprobante se mandó a un grupo, así que el teléfono no identifica al
                      deudor.
                    </p>
                  </div>
                ) : null}

                <LoanReferenceFields
                  idPrefix="loan"
                  fiatCurrencyLabel={fiatCurrency}
                  bcvEnabled={fiatCurrency.trim().toUpperCase() === 'VES'}
                  preferredValue={preferredValue}
                  onPreferredValueChange={setPreferredValue}
                  fiatAmount={fiatAmount}
                  usdtAmount={usdtAmount}
                  bcvAmount={bcvAmount}
                  onFiatAmountChange={setFiatAmount}
                  onUsdtAmountChange={setUsdtAmount}
                  onBcvAmountChange={setBcvAmount}
                />

                {/* Explicar en qué unidad queda la deuda no es una alerta: en ámbar y con
                    triángulo se lee como un problema y acaba ignorándose. */}
                {preferredValue !== 'FIAT' ? (
                  <div className="flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sky-700 dark:text-sky-400">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs text-pretty">
                      Con <span className="font-semibold">
                        {preferredValue === 'BCV' ? 'USD a tasa BCV' : 'USDT'}
                      </span>{' '}
                      como referencia, lo que el cliente abone en {fiatCurrency || 'fiat'} se
                      descontará a la tasa del día de cada abono.
                    </p>
                  </div>
                ) : null}

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
                        if (preferredValue === 'BCV' && value !== 'VES') setPreferredValue('USDT');
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
        </SidePanelBody>
      ) : null}

      {step === 'loan' ? (
        <SidePanelFooter>
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
        </SidePanelFooter>
      ) : null}

      {step === 'personal' || step === 'irrelevant' ? (
        <>
          <SidePanelBody>
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
          </SidePanelBody>

          <SidePanelFooter>
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
          </SidePanelFooter>
        </>
      ) : null}

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

      <CorrectReceiptDialog
        payment={correcting ? payment : null}
        table="outgoing"
        onCancel={() => setCorrecting(false)}
        onSaved={finish}
      />
    </SidePanel>
  );
}
