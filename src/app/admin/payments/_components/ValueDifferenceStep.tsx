'use client';

import { AlertTriangle, ChevronLeft, Info } from 'lucide-react';
import { SidePanelBody, SidePanelFooter } from '@/components/shared/SidePanel';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/functions';
import type { PairRounding } from '@/utils/rounding';
import type { PaymentTable } from '@/types/payment';

/** Qué se decidió hacer con la diferencia entre el comprobante y el valor de la operación. */
export type DifferenceChoice = 'raise' | 'balance' | 'keep';

export interface ValueDifference {
  /** `over`: el comprobante da más de lo que vale la operación. `short`: no la cubre. */
  kind: 'over' | 'short';
  /**
   * El comprobante está en la moneda CALCULADA del par (un pago móvil en VES de un USD-VES).
   * Solo entonces la diferencia se lee como una tasa distinta a la cotizada; si el
   * comprobante está del lado del valor, lo que sobra es dinero sin asignar y nada más.
   */
  onCounterSide: boolean;
  /** La diferencia es tan grande que parece un error de tecleo: no se ofrece crearla. */
  suspicious: boolean;
  paymentAmount: number;
  paymentCurrency: string;
  /** Moneda del valor de la operación (el lado origen del par). */
  valueCurrency: string;
  /** Lo que el operador escribió como valor, y lo que eso cubre del comprobante. */
  typedValue: number;
  coveredInPaymentCurrency: number;
  /** La diferencia, en la moneda del comprobante y en la del valor. */
  diffPayment: number;
  diffValue: number;
  /** Lo que vale el comprobante entero: a cuánto subiría la operación. */
  receiptValue: number;
  /** Tasa cotizada y la que quedaría si se deja la diferencia. Solo con `onCounterSide`. */
  quotedRate: number | null;
  effectiveRate: number | null;
  /** Sobrante acreditable al saldo del cliente, en USD. `null` si no se puede acreditar. */
  creditableUsd: number | null;
}

interface BuildArgs {
  table: PaymentTable;
  paymentAmount: number;
  paymentCurrency: string;
  valueCurrency: string;
  counterCurrency: string;
  /** Unidades de `counterCurrency` por 1 de `valueCurrency`, ya con el redondeo del par. */
  rate: number;
  typedValue: number;
  rounding: PairRounding | null;
  /** Sobrante acreditable en USD, si el saldo del cliente puede recibirlo. */
  creditableUsd: (diffValue: number, diffPayment: number) => number | null;
}

const CENT = 0.01;

/**
 * Cuánta diferencia se deja pasar sin preguntar, en la moneda del comprobante.
 *
 * Sale del redondeo que el par ya tiene configurado, como pide el diseño: por debajo de un
 * escalón de redondeo la diferencia es la del propio redondeo, no una decisión del operador.
 * El escalón solo se traduce a dinero cuando cae del lado del comprobante — un paso de 5
 * VES por dólar no dice nada sobre un comprobante en dólares.
 */
function toleranceInPaymentCurrency(
  rounding: PairRounding | null,
  typedValue: number,
  onCounterSide: boolean,
): number {
  if (!rounding) return CENT;
  if (rounding.mode === 'RATE') {
    return onCounterSide ? Math.max(typedValue * rounding.step, CENT) : CENT;
  }
  const stepIsOnPaymentSide = (rounding.amountSide === 'TO') === onCounterSide;
  return stepIsOnPaymentSide ? Math.max(rounding.step, CENT) : CENT;
}

/**
 * La diferencia entre el comprobante y el valor que escribió el operador, o `null` si cae
 * dentro de la tolerancia del par (y entonces se crea sin preguntar nada).
 */
export function buildValueDifference(args: BuildArgs): ValueDifference | null {
  const { paymentAmount, paymentCurrency, valueCurrency, counterCurrency, rate, typedValue } = args;
  const pairRounding = args.rounding;
  if (!(paymentAmount > 0) || !(typedValue > 0) || !(rate > 0)) return null;

  const pay = paymentCurrency.toUpperCase();
  const onCounterSide = pay === counterCurrency.toUpperCase();
  if (!onCounterSide && pay !== valueCurrency.toUpperCase()) return null;

  // Lo que vale el comprobante en la moneda del valor, y lo que el valor escrito cubre de él.
  const receiptValue = onCounterSide ? paymentAmount / rate : paymentAmount;
  const coveredInPaymentCurrency = onCounterSide ? typedValue * rate : typedValue;

  const diffPayment = paymentAmount - coveredInPaymentCurrency;
  const diffValue = receiptValue - typedValue;
  if (Math.abs(diffPayment) < toleranceInPaymentCurrency(pairRounding, typedValue, onCounterSide)) {
    return null;
  }

  const ratio = typedValue / receiptValue;
  return {
    kind: diffPayment > 0 ? 'over' : 'short',
    onCounterSide,
    suspicious: ratio <= 0.1 || ratio >= 10,
    paymentAmount,
    paymentCurrency: pay,
    valueCurrency: valueCurrency.toUpperCase(),
    typedValue,
    coveredInPaymentCurrency,
    diffPayment: Math.abs(diffPayment),
    diffValue: Math.abs(diffValue),
    receiptValue,
    quotedRate: onCounterSide ? rate : null,
    effectiveRate: onCounterSide ? paymentAmount / typedValue : null,
    creditableUsd:
      diffPayment > 0 ? args.creditableUsd(Math.abs(diffValue), Math.abs(diffPayment)) : null,
  };
}

/** Título del paso, que el cajón muestra en su cabecera en lugar del de «vincular». */
export function differenceTitle(d: ValueDifference): string {
  const amount = d.onCounterSide
    ? `${formatNumber(d.diffPayment)} ${d.paymentCurrency}`
    : `${formatNumber(d.diffValue)} ${d.valueCurrency}`;
  if (d.kind === 'short') return `Faltan ${amount} para esta operación`;
  return d.onCounterSide ? `Sobran ${amount} en este pago` : `Sobran ${amount} de este comprobante`;
}

/** Las opciones que tiene el operador, en el orden en que se le ofrecen. */
export function differenceChoices(d: ValueDifference): DifferenceChoice[] {
  if (d.kind === 'short' || d.suspicious) return [];
  const choices: DifferenceChoice[] = ['raise'];
  if (d.creditableUsd != null) choices.push('balance');
  choices.push('keep');
  return choices;
}

/** Texto del botón que confirma, para que diga exactamente qué va a crear. */
export function differenceCta(d: ValueDifference, choice: DifferenceChoice): string {
  if (choice === 'raise') return `Crear por ${formatNumber(d.receiptValue)} ${d.valueCurrency}`;
  if (choice === 'balance' && d.creditableUsd != null) {
    return `Crear y acreditar ${formatNumber(d.creditableUsd)} USD`;
  }
  return `Crear por ${formatNumber(d.typedValue)} ${d.valueCurrency}`;
}

/**
 * La nota que queda guardada en la operación cuando se decide dejar la diferencia. Sin
 * esto, quién lo decidió y por qué se perdían con el diálogo que lo preguntó.
 */
export function differenceNote(d: ValueDifference, choice: DifferenceChoice): string | null {
  if (choice !== 'keep' || d.kind === 'short') return null;
  const sobra = d.onCounterSide
    ? `${formatNumber(d.diffPayment)} ${d.paymentCurrency}`
    : `${formatNumber(d.diffValue)} ${d.valueCurrency}`;
  const rate =
    d.effectiveRate != null && d.quotedRate != null
      ? ` La tasa efectiva del pago queda en ${formatNumber(d.effectiveRate)} en vez de ${formatNumber(d.quotedRate)}.`
      : '';
  return `Diferencia con el comprobante dejada a propósito: sobran ${sobra}.${rate}`;
}

function Row({
  label,
  value,
  hint,
  strong,
}: {
  label: React.ReactNode;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <span className={cn('min-w-0 text-xs', strong ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      <span
        className={cn(
          'shrink-0 text-right font-mono text-xs tabular-nums',
          strong ? 'text-sm font-bold text-foreground' : 'text-foreground',
        )}
      >
        {value}
        {hint ? <span className="ml-1 font-sans text-[11px] font-medium text-muted-foreground">{hint}</span> : null}
      </span>
    </div>
  );
}

interface ValueDifferenceStepProps {
  difference: ValueDifference;
  table: PaymentTable;
  choice: DifferenceChoice;
  onChoice: (choice: DifferenceChoice) => void;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

/**
 * Paso de revisión cuando el valor de la operación no coincide con el comprobante.
 *
 * Sustituye al modal que se abría ENCIMA del cajón: allí la advertencia tapaba justo el
 * comprobante y el par que hacían falta para decidir, y la única salida era «continuar» o
 * cancelarlo todo. Aquí el cuerpo del cajón se reemplaza —la cabecera con el comprobante se
 * queda— y la diferencia se plantea como una decisión con nombre y monto.
 */
export function ValueDifferenceStep({
  difference: d,
  table,
  choice,
  onChoice,
  onBack,
  onConfirm,
  submitting,
}: ValueDifferenceStepProps) {
  const choices = differenceChoices(d);
  const paid = table === 'incoming' ? 'El cliente pagó' : 'Se le pagó al cliente';
  const leftover = d.onCounterSide
    ? `${formatNumber(d.diffPayment)} ${d.paymentCurrency}`
    : `${formatNumber(d.diffValue)} ${d.valueCurrency}`;

  // Con el comprobante del lado calculado, dejar la diferencia mueve la tasa. A quién
  // beneficia depende de la dirección: si el cliente paga de más, paga peor; si la casa
  // le paga de más, el cliente sale ganando y la diferencia la pone la casa.
  const ratePct =
    d.effectiveRate != null && d.quotedRate != null && d.quotedRate > 0
      ? Math.abs((d.effectiveRate / d.quotedRate - 1) * 100)
      : null;

  return (
    <>
      <SidePanelBody className="gap-3.5">
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          <Row label={paid} value={`${formatNumber(d.paymentAmount)} ${d.paymentCurrency}`} />
          <Row
            label={
              <>
                Tu operación cubre{' '}
                <span className="font-semibold text-foreground">
                  {formatNumber(d.typedValue)} {d.valueCurrency}
                  {d.quotedRate != null ? ` a ${formatNumber(d.quotedRate)}` : ''}
                </span>
              </>
            }
            value={`${formatNumber(d.coveredInPaymentCurrency)} ${d.paymentCurrency}`}
          />
          <Row
            strong
            label={d.kind === 'over' ? 'Sobran' : 'Faltan'}
            value={leftover}
            hint={d.onCounterSide ? `≈ ${formatNumber(d.diffValue)} ${d.valueCurrency}` : undefined}
          />
        </div>

        {d.suspicious ? (
          <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-pretty text-destructive">
              El valor escrito y el comprobante no se parecen en nada
              {d.effectiveRate != null && d.quotedRate != null
                ? ` — la tasa efectiva saldría ${formatNumber(d.effectiveRate)} contra los ${formatNumber(d.quotedRate)} cotizados`
                : ''}
              . Vuelve y escribe el monto otra vez.
            </p>
          </div>
        ) : d.kind === 'short' ? (
          <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-pretty text-muted-foreground">
              La operación queda <strong className="font-semibold text-foreground">parcial</strong> y
              esperando el siguiente comprobante. No se bloquea el vínculo: puedes crearla así y
              vincular el resto cuando llegue.
            </p>
          </div>
        ) : ratePct != null ? (
          <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <p className="text-xs text-pretty text-amber-800 dark:text-amber-200">
              Si lo dejas así, el cliente habrá{' '}
              {table === 'incoming' ? 'pagado' : 'recibido'} a{' '}
              <strong className="font-semibold">{formatNumber(d.effectiveRate ?? 0)}</strong> en vez
              de <strong className="font-semibold">{formatNumber(d.quotedRate ?? 0)}</strong> — un{' '}
              <strong className="font-semibold">{ratePct.toFixed(2)} %</strong>{' '}
              {table === 'incoming'
                ? 'peor para él. Es la clase de diferencia que vuelve como reclamo.'
                : 'a su favor que pone la casa.'}
            </p>
          </div>
        ) : (
          <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-pretty text-muted-foreground">
              El resto queda sin asignar en el comprobante: podrás repartirlo a otra operación o
              acreditarlo al saldo del cliente.
            </p>
          </div>
        )}

        {choices.length > 0 ? (
          <div className="space-y-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              Qué hacemos con los {leftover}
            </span>
            <RadioGroup value={choice} onValueChange={(v: string) => onChoice(v as DifferenceChoice)}>
              {choices.map((c) => (
                <label
                  key={c}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                    choice === c ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  <RadioGroupItem value={c} className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-foreground">
                        {c === 'raise'
                          ? `Subir la operación a ${formatNumber(d.receiptValue)} ${d.valueCurrency}`
                          : c === 'balance'
                            ? `Dejar ${formatNumber(d.creditableUsd ?? 0)} USD como saldo a favor`
                            : d.effectiveRate != null
                              ? `Dejarlo así, a ${formatNumber(d.effectiveRate)}`
                              : `Dejar ${leftover} sin asignar`}
                      </span>
                      {c === 'raise' ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          Sugerido
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-pretty text-muted-foreground">
                      {c === 'raise'
                        ? d.quotedRate != null
                          ? `Mantiene la tasa cotizada de ${formatNumber(d.quotedRate)} y el comprobante queda cubierto al céntimo.`
                          : 'El comprobante queda cubierto al céntimo, sin nada suelto que repartir.'
                        : c === 'balance'
                          ? `La operación se queda en ${formatNumber(d.typedValue)} ${d.valueCurrency} y el resto se le acredita al cliente para su próximo cambio.`
                          : d.onCounterSide
                            ? `Los ${leftover} se quedan en la casa. Queda anotado en la operación quién lo decidió.`
                            : `Los ${leftover} quedan sin asignar en el comprobante, para repartirlos después.`}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
        ) : null}
      </SidePanelBody>

      <SidePanelFooter>
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          <ChevronLeft className="h-4 w-4" />
          Volver al monto
        </Button>
        {d.suspicious ? null : (
          <Button onClick={onConfirm} disabled={submitting}>
            {differenceCta(d, choice)}
          </Button>
        )}
      </SidePanelFooter>
    </>
  );
}
