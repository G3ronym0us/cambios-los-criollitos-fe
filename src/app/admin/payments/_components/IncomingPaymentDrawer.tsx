'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRightLeft,
  ChevronRight,
  IdCard,
  Split,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SidePanel,
  SidePanelBody,
  SidePanelHeader,
  SidePanelTitle,
} from '@/components/shared/SidePanel';
import { cn } from '@/lib/utils';
import { paymentService } from '@/services/paymentService';
import { formatNumber } from '@/utils/functions';
import { canBeDefaultAccount } from '@/utils/paymentBlock';
import type { PaymentData, PaymentSuggestion } from '@/types/payment';
import { LinkOperationPanel } from './LinkOperationPanel';
import { PaymentAllocationsPanel } from './PaymentAllocationsPanel';
import { describePayment, describeSuggestion } from './paymentRowData';

interface IncomingPaymentDrawerProps {
  payment: PaymentData | null;
  onClose: () => void;
  onDone: () => void;
  onConverted: (payment: PaymentData) => void;
  onSaveClientData: (payment: PaymentData) => void;
}

type Step = 'detail' | 'operation' | 'allocations' | 'balance';

// Métodos que liquidan en USD: los únicos que el backend acepta como crédito de saldo.
const BALANCE_CURRENCIES = new Set(['USD', 'ZELLE', 'PAYPAL']);

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/** Fila de "otras acciones": icono, título, explicación de la consecuencia y chevron. */
function ActionRow({
  icon: Icon,
  title,
  description,
  highlight,
  onClick,
  disabled,
}: {
  icon: typeof Split;
  title: string;
  description: string;
  highlight?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:opacity-60',
        highlight ? 'border-amber-500/40 bg-amber-500/5' : 'border-border hover:bg-muted/50',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          highlight ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/**
 * Detalle y gestión de un comprobante entrante, en cajón lateral.
 *
 * Sustituye al diálogo por pasos: antes había que abrir un modal para elegir qué hacer,
 * otro para ver el texto del OCR y otro para vincular. Aquí todo lo que sirve para decidir
 * —cliente, datos leídos, texto crudo y operación sugerida— está a la vista de una vez, y
 * los pasos largos (vincular, repartir, acreditar) se despliegan dentro del mismo cajón.
 */
export function IncomingPaymentDrawer({
  payment,
  onClose,
  onDone,
  onConverted,
  onSaveClientData,
}: IncomingPaymentDrawerProps) {
  const [step, setStep] = useState<Step>('detail');
  const [submitting, setSubmitting] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNotes, setBalanceNotes] = useState('');
  const [suggestion, setSuggestion] = useState<PaymentSuggestion | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setStep('detail');
    setSubmitting(false);
    setBalanceAmount(payment.amount != null ? String(payment.amount) : '');
    setBalanceNotes('');
    setSuggestion(null);
    setShowRawText(false);
    if (payment.operation_uuid) return; // ya vinculado: no hay nada que sugerir
    let active = true;
    paymentService.getSuggestions('incoming', [payment.id]).then((res) => {
      if (active && res.success && res.data) setSuggestion(res.data.items[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, [payment]);

  if (!payment) return null;

  const p = payment;
  const d = describePayment(p);
  const unassigned = p.unassigned_amount ?? 0;
  const balanceEligible = BALANCE_CURRENCIES.has((p.currency || '').toUpperCase());

  const finish = () => {
    onDone();
    onClose();
  };

  const linkSuggested = async () => {
    if (!suggestion) return;
    setSubmitting(true);
    const res = await paymentService.linkOperation('incoming', p.id, suggestion.operation_uuid);
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago vinculado a la operación sugerida');
      finish();
    } else {
      toast.error(res.error || 'No se pudo vincular el pago');
    }
  };

  const saveBalanceCredit = async () => {
    const amt = parseFloat(balanceAmount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('El monto debe ser mayor a 0');

    setSubmitting(true);
    const res = await paymentService.creditBalance(p.id, {
      amount: amt,
      notes: balanceNotes.trim() || null,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago acreditado como saldo a favor del cliente');
      finish();
    } else {
      toast.error(res.error || 'No se pudo acreditar el saldo');
    }
  };

  const convertToOutgoing = async () => {
    setSubmitting(true);
    const res = await paymentService.convertToOutgoing(p.id);
    setSubmitting(false);
    if (res.success && res.data) {
      toast.success('Pago convertido en saliente');
      onConverted(res.data);
      onClose();
    } else {
      toast.error(res.error || 'No se pudo convertir el pago en saliente');
    }
  };

  const receiptFields = [
    { label: 'Referencia', value: p.reference, mono: true },
    { label: 'Banco origen', value: p.bank_from || p.provider },
    { label: 'Cuenta / correo', value: p.account_number || p.phone_to },
    { label: 'Identificación', value: p.identification },
  ].filter((f) => !!f.value);

  return (
    <SidePanel open onOpenChange={(open) => !open && onClose()}>
      <SidePanelHeader>
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-primary">
            Entrante
          </span>
          <span className="font-mono text-[11.5px] text-muted-foreground">#{p.id}</span>
        </div>
        <SidePanelTitle className="mt-2 text-2xl font-bold tabular-nums text-foreground">
          {d.amount}{' '}
          <span className="text-base font-semibold text-muted-foreground">{p.currency ?? ''}</span>
        </SidePanelTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[p.provider, p.bank_from, `${d.day} ${d.time}`].filter(Boolean).join(' · ')}
        </p>
      </SidePanelHeader>

      {step === 'detail' ? (
        <SidePanelBody>
          {/* Quién pagó */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground"
            >
              {initials(d.client) || '?'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{d.client}</div>
              <div className="truncate text-xs text-muted-foreground">
                {(p.client_phone || '').replace(/@(c|g)\.us$/, '') || 'Sin teléfono'}
              </div>
            </div>
            {p.client_uuid ? (
              <Link
                href={`/admin/clients/${p.client_uuid}`}
                className="shrink-0 text-xs font-semibold text-primary hover:underline"
              >
                Ver perfil
              </Link>
            ) : null}
          </div>

          {/* Qué leyó el bot */}
          {receiptFields.length > 0 ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Datos del comprobante
                </span>
                {p.corrected_at ? (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Corregido a mano
                  </span>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
                {receiptFields.map((f, i) => (
                  <div
                    key={f.label}
                    className={cn(
                      'bg-card px-3 py-2',
                      // Con un número impar de datos el último ocupa la fila entera: si no,
                      // queda una celda vacía que se lee como un dato que falta.
                      i === receiptFields.length - 1 && receiptFields.length % 2 === 1 && 'col-span-2',
                    )}
                  >
                    <dt className="text-[11px] text-muted-foreground">{f.label}</dt>
                    <dd
                      className={cn(
                        'truncate text-xs font-medium text-foreground',
                        f.mono && 'font-mono',
                      )}
                    >
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {p.correction_original ? (
                <p className="mt-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                  El OCR leyó <span className="line-through">{p.correction_original}</span> → corregido
                  a {d.amount}.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Texto crudo del OCR: plegado, porque casi siempre confirma lo de arriba */}
          {p.raw_text ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setShowRawText((v) => !v)}
                aria-expanded={showRawText}
                className="flex w-full items-center justify-between gap-2 bg-muted/60 px-3 py-2 text-left"
              >
                <span className="text-xs font-semibold text-foreground">Texto detectado por el bot</span>
                <span className="text-[11px] font-semibold text-primary">
                  {showRawText ? 'Ocultar' : 'Ver'}
                </span>
              </button>
              {showRawText ? (
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap bg-card px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {p.raw_text}
                </pre>
              ) : null}
            </div>
          ) : null}

          {/* Operación sugerida */}
          {suggestion && !p.operation_uuid ? (
            <div className="rounded-xl border border-primary/40 bg-card p-3 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  <Sparkles className="h-3 w-3" />
                  Operación sugerida
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {suggestion.confident ? 'confianza alta' : 'hay otra candidata parecida'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-[13px] font-semibold text-foreground">
                  {describeSuggestion(suggestion)}
                </p>
                {suggestion.delta != null ? (
                  <span
                    className={cn(
                      'shrink-0 text-xs font-semibold tabular-nums',
                      Math.abs(suggestion.delta) < 0.005
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground',
                    )}
                    title="Diferencia entre lo que pide la operación y lo que llegó"
                  >
                    {Math.abs(suggestion.delta) < 0.005
                      ? '±0'
                      : `${suggestion.delta > 0 ? '+' : '-'}${formatNumber(Math.abs(suggestion.delta))}`}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <Button className="flex-1" onClick={linkSuggested} disabled={submitting}>
                  Vincular a esta operación
                </Button>
                <Button variant="outline" onClick={() => setStep('operation')} disabled={submitting}>
                  Elegir otra
                </Button>
              </div>
            </div>
          ) : null}

          {/* Todo lo demás */}
          <div className="space-y-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              {suggestion && !p.operation_uuid ? 'Otras acciones' : 'Acciones'}
            </span>

            {!suggestion || p.operation_uuid ? (
              <ActionRow
                icon={ArrowRightLeft}
                title={p.operation_uuid ? 'Cambiar la operación vinculada' : 'Vincular a una operación'}
                description={
                  p.operation_uuid
                    ? 'Ya vinculada — ábrela para ver o cambiar la cotización.'
                    : 'Asociar el pago a una cotización del cliente.'
                }
                onClick={() => setStep('operation')}
              />
            ) : null}

            {p.operation_uuid || (p.allocations_count ?? 0) > 0 ? (
              <ActionRow
                icon={Split}
                title="Repartir entre operaciones"
                description={
                  unassigned > 0.01
                    ? `Quedan ${formatNumber(unassigned)} ${p.currency ?? ''} sin asignar a ninguna operación.`
                    : 'Un mismo pago puede cubrir varios cambios (parte en BRL y parte en VES).'
                }
                highlight={unassigned > 0.01}
                onClick={() => setStep('allocations')}
              />
            ) : null}

            {balanceEligible ? (
              <ActionRow
                icon={Wallet}
                title="Acreditar como saldo a favor"
                description="El cliente deja el dinero en cuenta y cobra en abonos a la tasa del día."
                onClick={() => setStep('balance')}
              />
            ) : null}

            {p.client_uuid && canBeDefaultAccount(p) ? (
              <ActionRow
                icon={IdCard}
                title="Guardar como datos del cliente"
                description="El bot los inyectará cuando el cliente pida un cambio sin datos."
                onClick={() => onSaveClientData(p)}
              />
            ) : null}

            <ActionRow
              icon={ArrowRightLeft}
              title="Convertir en pago saliente"
              description="Devuélvelo a Salientes si el bot lo clasificó como entrante por error."
              onClick={convertToOutgoing}
              disabled={submitting}
            />
          </div>
        </SidePanelBody>
      ) : step === 'allocations' ? (
        <SidePanelBody>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Repartir el pago</h3>
            <p className="text-xs text-muted-foreground">
              Qué parte de este comprobante respalda a cada operación. Lo que quede puede ir a otra
              operación o al saldo del cliente.
            </p>
          </div>
          <PaymentAllocationsPanel
            payment={p}
            onSaved={finish}
            onCancel={() => setStep('detail')}
            onCreditRest={(amount) => {
              setBalanceAmount(String(amount));
              setStep('balance');
            }}
          />
        </SidePanelBody>
      ) : step === 'operation' ? (
        <SidePanelBody>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Vincular a operación</h3>
            <p className="text-xs text-muted-foreground">
              Elige la cotización a la que pertenece este pago. Busca por cliente, par, monto o ID.
            </p>
          </div>
          <LinkOperationPanel
            payment={p}
            table="incoming"
            onSuccess={finish}
            onCancel={() => setStep('detail')}
            cancelLabel="Volver"
          />
        </SidePanelBody>
      ) : (
        <SidePanelBody>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Acreditar como saldo a favor</h3>
            <p className="text-xs text-muted-foreground">
              Suma el monto al saldo del cliente. Cada abono posterior se cotiza a la tasa del día y
              lo descuenta.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="balance-amount">Monto (USD)</Label>
              <Input
                id="balance-amount"
                inputMode="decimal"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="0.00"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="balance-notes">Nota (opcional)</Label>
              <Input
                id="balance-notes"
                value={balanceNotes}
                onChange={(e) => setBalanceNotes(e.target.value)}
                placeholder="Ej.: pagos parciales acordados con el cliente"
                className="h-10"
              />
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
            <Button variant="ghost" onClick={() => setStep('detail')} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button onClick={saveBalanceCredit} disabled={submitting}>
              <Wallet className="h-4 w-4" />
              {submitting ? 'Guardando…' : 'Acreditar saldo'}
            </Button>
          </div>
        </SidePanelBody>
      )}
    </SidePanel>
  );
}
