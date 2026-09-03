'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, CircleAlert, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { SidePanelBody, SidePanelFooter } from '@/components/shared/SidePanel';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FundChips } from './FundChips';
import { FundManagerField } from './FundManagerField';
import { FundStep } from './FundStep';
// Vive en shared/: la ficha del cliente también lo usa, para editar su par por defecto.
import { PairPicker } from '@/components/shared/PairPicker';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { fundService } from '@/services/fundService';
import { paymentService } from '@/services/paymentService';
import { ratesService } from '@/services/ratesService';
import { operationService } from '@/services/operationService';
import type { CurrencyPairData } from '@/types/admin';
import type { ExchangeRateResponse } from '@/types/currency';
import type { FundGroup } from '@/types/fund';
import type { PaymentData, PaymentTable } from '@/types/payment';
import { defaultManagerFor, fundFieldMode, settleCurrency, splitFundOptions } from '../_lib/fundManagerField';
import { formatAmountForInput, sanitizeAmountInput } from '@/utils/functions';
import {
  applyRounding,
  effectiveRate as toEffectiveRate,
  pairRoundingFrom,
  quotePair,
  rateDecimals,
  type AmountSide,
} from '@/utils/rounding';
import { roundOptions, type RoundOption } from './roundAmounts';
import {
  buildValueDifference,
  differenceChoices,
  differenceNote,
  differenceTitle,
  ValueDifferenceStep,
  type DifferenceChoice,
  type ValueDifference,
} from './ValueDifferenceStep';

/**
 * La tasa que el selector muestra junto a cada par: la que el formulario va a aplicar.
 * Si el par redondea la tasa (modo RATE) se muestra ya redondeada —USD-VES cotiza a 915,
 * no a los 919,005 crudos del scraper—; en cualquier otro caso, la del par tal cual.
 */
function quotedRateOf(rate: ExchangeRateResponse): number {
  const rounding = pairRoundingFrom(rate);
  if (rounding?.mode !== 'RATE') return rate.rate;
  const rounded = applyRounding(
    toEffectiveRate(rate.rate, rate.inverse_percentage),
    rounding.step,
    rounding.direction,
  );
  return rounded > 0 ? rounded : rate.rate;
}

/**
 * Sanea el campo de tasa. Admite más decimales que un monto porque una tasa puede vivir en
 * el cuarto o el sexto (BRL→USDT cotiza a 0,193236): recortarla a dos céntimos movería el
 * margen que el operador está fijando.
 */
function sanitizeRateInput(value: string): string | null {
  const normalized = value.replace(',', '.');
  return /^\d*(?:\.\d{0,8})?$/.test(normalized) ? normalized : null;
}

/** Sanea el campo de margen. Admite negativo: pagar por encima de la tasa es un caso real. */
function sanitizeMarginInput(value: string): string | null {
  const normalized = value.replace(',', '.');
  return /^-?\d*(?:\.\d{0,4})?$/.test(normalized) ? normalized : null;
}

/** Quita el `-0` que deja redondear un número negativo minúsculo. */
function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function formatRateForInput(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '';
  // Dos decimales más que los de lectura: la tasa base rara vez es redonda, y mostrarla
  // corta haría que el «sin margen» del botón se registrara como un 0,0001% cualquiera.
  return String(Number(rate.toFixed(rateDecimals(rate) + 2)));
}

function formatMarginForInput(margin: number): string {
  if (!Number.isFinite(margin)) return '';
  return String(normalizeZero(Math.round(margin * 10000) / 10000));
}

interface CreateOperationFormProps {
  payment: PaymentData;
  table: PaymentTable;
  onSuccess: () => void;
  onBack: () => void;
  /**
   * El paso de la diferencia manda en la cabecera del cajón mientras dura: el título pasa a
   * ser el monto que sobra y el cajón deja de anunciar «vincular a operación». Los hosts que
   * no la implementan simplemente mantienen su cabecera.
   */
  onHeaderChange?: (header: { title: string; eyebrow: string } | null) => void;
}

export function CreateOperationForm({
  payment,
  table,
  onSuccess,
  onBack,
  onHeaderChange,
}: CreateOperationFormProps) {
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  // Cuántas operaciones lleva ESTE cliente en cada par, y la tasa vigente de todos. Las dos
  // cosas se piden una sola vez al abrir: el selector las necesita para ordenar y para que
  // el operador no tenga que ir a otra pantalla a comprobar la tasa.
  const [pairUsage, setPairUsage] = useState<Map<string, { count: number }>>(new Map());
  const [pairRates, setPairRates] = useState<Map<string, { rate: number; updatedAt: string | null }>>(new Map());
  const [clientOps, setClientOps] = useState(0);
  const [clientName, setClientName] = useState<string | null>(null);
  const [preferredUuid, setPreferredUuid] = useState<string | null>(null);
  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [pairUuid, setPairUuid] = useState('');
  const [direction, setDirection] = useState<'SEND' | 'RECEIVE'>('SEND');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [activeRate, setActiveRate] = useState<ExchangeRateResponse | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState(false);
  // La tasa propia de ESTA operación, en forma directa (`to` por 1 de `from`). `null` = la
  // del par. Es el corazón del cajón: mientras no exista, el margen es el que el par cobra.
  const [manualRate, setManualRate] = useState<number | null>(null);
  const [rateInput, setRateInput] = useState('');
  const [marginInput, setMarginInput] = useState('');
  // El lado calculado, sin recortar al céntimo. `from_amount`/`to_amount` viajan así al
  // backend porque de su cociente sale el margen: 172,07 en vez de 172,072948 convierte un
  // 0% exacto en un −0,0001% que `implied_margin` ya no reconoce como margen y descarta.
  const [derivedExact, setDerivedExact] = useState<number | null>(null);
  const [fundGroupUuid, setFundGroupUuid] = useState('');
  const [exchangeUserUuid, setExchangeUserUuid] = useState('');
  const [creating, setCreating] = useState(false);
  // Mientras haya diferencia, el cuerpo del cajón es el paso de revisión y no el formulario.
  const [difference, setDifference] = useState<ValueDifference | null>(null);
  const [choice, setChoice] = useState<DifferenceChoice>('raise');
  // Mientras dura, el cuerpo del cajón es el paso de elegir fondo (`FundStep`): la lista
  // completa de fondos, sugeridos primero. Lo abre «Cambiar» del campo, o el chip «Otro fondo».
  const [showFundStep, setShowFundStep] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // La tasa siempre está a la vista; lo que se pliega es el EDITOR. En la mayoría de las
  // cotizaciones nadie lo toca —el par ya trae su tasa, ya redondeada— y ocupaba ~230 px
  // por encima de los montos, que son el trabajo.
  const [showRateEditor, setShowRateEditor] = useState(false);
  // El monto redondo con el que se fijó la tasa, para que la línea diga de dónde sale.
  const [roundedTo, setRoundedTo] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Por referencia: así el efecto de abajo depende SOLO del paso, y un host que pase una
  // función nueva en cada render no lo vuelve a disparar.
  const headerRef = useRef(onHeaderChange);
  headerRef.current = onHeaderChange;

  // La cabecera del cajón sigue al paso activo: mientras dura la revisión de la diferencia o
  // la elección de fondo el título es el de ese paso, y al volver —o al cerrar— el cajón
  // recupera el suyo. La diferencia manda si las dos coincidieran, aunque en la práctica no
  // se solapan: el fondo se elige antes de enviar, la diferencia se revisa después.
  useEffect(() => {
    const notify = headerRef.current;
    if (!notify) return;
    if (difference) {
      notify({ title: differenceTitle(difference), eyebrow: 'Nueva cotización · paso 2 de 2' });
    } else if (showFundStep) {
      notify({ title: 'Fondo del movimiento', eyebrow: 'Nueva cotización · elegir fondo' });
    } else {
      notify(null);
    }
    return () => notify(null);
  }, [difference, showFundStep]);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      adminService.getCurrencyPairs(0, 200, true),
      fundService.getGroups(),
      payment.client_uuid ? clientService.getClient(payment.client_uuid) : Promise.resolve(null),
    ]).then(([pairsRes, groupsRes, clientRes]) => {
      if (pairsRes.success && pairsRes.data) setPairs(pairsRes.data.pairs);
      if (groupsRes.success && groupsRes.data) {
        const active = groupsRes.data.filter((g) => g.is_active);
        setGroups(active);

        // Prefill: el fondo donde ya se contabilizó el comprobante (ej. reenviado al grupo
        // y convertido a entrante), con su gestor por defecto. Sin esto la op nacía huérfana
        // del fondo que el pago ya tenía y había que volver a elegirlo a mano. El campo está
        // deshabilitado mientras `loadingData` es true, así que no hay nada que pisar aquí.
        const prefillGroup = payment.fund_group_uuid
          ? active.find((g) => g.uuid === payment.fund_group_uuid)
          : undefined;
        if (prefillGroup) {
          setFundGroupUuid(prefillGroup.uuid);
          setExchangeUserUuid(defaultManagerFor(prefillGroup)?.user_uuid ?? '');
        }
      }

      // Prefill: par por defecto del cliente (editable). Solo si aún no se eligió
      // uno y el par preferido está entre los pares activos.
      const preferred = clientRes?.success ? clientRes.data?.preferred_pair_uuid : null;
      if (preferred && pairsRes.success && pairsRes.data?.pairs.some((p) => p.uuid === preferred)) {
        setPairUuid((current) => current || preferred);
      }
      setPreferredUuid(preferred ?? null);
      setClientName(clientRes?.success ? (clientRes.data?.display_name ?? null) : null);

    }).finally(() => setLoadingData(false));
  }, [payment.client_uuid, payment.fund_group_uuid]);

  // Lo que el selector necesita para ordenarse: la tasa vigente de cada par y cuántas
  // operaciones lleva este cliente en cada uno. Va aparte del efecto de arriba porque no
  // bloquea el formulario — si tarda o falla, el selector simplemente no muestra ni tasas
  // ni conteos, y se puede elegir el par igual.
  useEffect(() => {
    ratesService.getAllActiveRates().then((res) => {
      if (!res.success || !res.data) return;
      setPairRates(
        new Map(
          res.data.map((r) => [
            r.currency_pair_uuid,
            { rate: quotedRateOf(r), updatedAt: r.updated_at ?? r.created_at ?? null },
          ]),
        ),
      );
    });
  }, []);

  useEffect(() => {
    if (!payment.client_phone) return;
    // El uso sale de las operaciones recientes del cliente y no de un endpoint nuevo: el
    // selector sólo necesita ordenar, y para eso las últimas 100 sobran.
    operationService.getOperations({ phone: payment.client_phone, limit: 100 }).then((res) => {
      if (!res.success || !res.data) return;
      const counts = new Map<string, { count: number }>();
      for (const op of res.data.operations) {
        if (!op.currency_pair_uuid) continue;
        counts.set(op.currency_pair_uuid, {
          count: (counts.get(op.currency_pair_uuid)?.count ?? 0) + 1,
        });
      }
      setPairUsage(counts);
      setClientOps(res.data.operations.length);
    });
  }, [payment.client_phone]);

  const pair = useMemo(() => pairs.find((p) => p.uuid === pairUuid), [pairs, pairUuid]);
  const fromCur = pair?.from_currency?.symbol ?? '';
  const toCur = pair?.to_currency?.symbol ?? '';

  useEffect(() => {
    if (!pairUuid) {
      setActiveRate(null);
      setRateError(false);
      return;
    }

    let active = true;
    setLoadingRate(true);
    setRateError(false);
    setActiveRate(null);
    // La tasa propia era de la cotización anterior: con otro par no significa nada.
    setManualRate(null);
    // Y con ella se va el editor abierto y el redondeo que la había fijado.
    setShowRateEditor(false);
    setRoundedTo(null);
    setDerivedExact(null);
    // La tasa del DÍA DEL COMPROBANTE, no la de hoy: al cliente se le cotizó cuando pagó, y
    // un pago de la mañana leído por la tarde cambiaba de trato solo porque la tasa se movió.
    // Si el comprobante es más viejo que el historial de tasas, se cae a la vigente.
    ratesService.getRateByPair(pairUuid, payment.created_at).then(async (res) => {
      if (!active) return;
      const fallback =
        !res.success && payment.created_at ? await ratesService.getRateByPair(pairUuid) : res;
      if (!active) return;
      setLoadingRate(false);
      if (fallback.success && fallback.data) {
        setActiveRate(fallback.data);
      } else {
        setActiveRate(null);
        setRateError(true);
      }
    });
    return () => {
      active = false;
    };
  }, [pairUuid, payment.created_at]);

  // Prefill: el monto del pago va al lado cuya moneda coincide con la del pago.
  useEffect(() => {
    if (!pair || payment.amount == null) return;
    const cur = (payment.currency || '').toUpperCase();
    if (cur && cur === fromCur.toUpperCase()) setFromAmount(String(payment.amount));
    else if (cur && cur === toCur.toUpperCase()) setToAmount(String(payment.amount));
  }, [pair, payment.amount, payment.currency, fromCur, toCur]);

  // La tasa que se pidió a fecha del comprobante ya no es la vigente: la desactivó la
  // siguiente. Es la señal más directa de que se está cotizando con la de aquel día.
  const rateIsHistoric = activeRate != null && activeRate.is_active === false;

  /**
   * Solo abre solo el caso que obliga a escribir: sin tasa activa no hay nada que cotizar
   * y el operador tiene que poner los dos montos a mano.
   *
   * La tasa histórica y la fijada a mano NO lo abren, aunque el diseño lo pedía: las dos
   * ya se anuncian en la línea (en ámbar, con su motivo y su salida). Abrirlas dejaba el
   * bloque desplegado casi siempre —el cajón pide la tasa a fecha del comprobante, así
   * que `is_active === false` es la norma en cuanto el pago no es de la última corrida— y
   * eso devolvía los ~230 px que este turno venía a quitar. Fijar la tasa desde un chip
   * de monto redondo tampoco debe desplegar nada.
   */
  const rateEditorOpen = showRateEditor || rateError;

  // El redondeo configurado en el par, el mismo que aplican el bot y la calculadora al
  // cotizar (USD-VES redondea la tasa a múltiplos de 5 hacia abajo: 919,005 → 915). Sin
  // esto la operación nacía con la tasa cruda y no con la que se le cotizó al cliente.
  const rounding = useMemo(
    () => (activeRate && activeRate.currency_pair_uuid === pairUuid ? pairRoundingFrom(activeRate) : null),
    [activeRate, pairUuid],
  );

  // La tasa del par tal cual se cotiza: con su margen y, en modo RATE, ya redondeada (que es
  // la que se le cotizó al cliente). En modo AMOUNT la tasa no cambia — el redondeo cae
  // sobre el monto calculado, no sobre ella.
  const pairEffectiveRate = useMemo(() => {
    if (!activeRate) return null;
    const quoted = quotePair(1, activeRate.rate, activeRate.inverse_percentage, 'SEND', rounding);
    return toEffectiveRate(quoted.rate, quoted.inverse);
  }, [activeRate, rounding]);

  /**
   * La tasa base del par: la misma contra la que el backend deduce el margen
   * (`implied_margin`). Pagarle al cliente a esta tasa es no cobrarle nada, y es a lo que
   * apunta el botón «sin margen».
   */
  const baseEffectiveRate = useMemo(() => {
    if (!activeRate) return null;
    const base = activeRate.base_rate ?? activeRate.rate;
    if (!base || base <= 0) return null;
    const direct = activeRate.inverse_percentage ? 1 / base : base;
    return Number.isFinite(direct) && direct > 0 ? direct : null;
  }, [activeRate]);

  /**
   * La tasa que manda en el formulario: la propia si el operador la fijó, la del par si no.
   * Todo cuelga de este número — los montos, el margen que se registrará y el paso de la
   * diferencia, que sin esto compararía el comprobante contra una tasa que ya nadie aplica.
   */
  const effectiveRate = manualRate ?? pairEffectiveRate;

  /**
   * El lado que NO se recalcula al mover la tasa: el que trae el monto del comprobante. Ese
   * dinero ya se movió y no lo cambia una tasa; lo que la tasa decide es cuánto vale el otro.
   */
  const anchorSide: AmountSide =
    (payment.currency || '').toUpperCase() === toCur.toUpperCase() ? 'RECEIVE' : 'SEND';

  // Misma orientación de tasa que usa la calculadora principal. El monto detectado
  // en el comprobante queda fijo y se calcula el lado opuesto; ambos campos siguen
  // siendo editables para que el operador pueda corregir el resultado.
  useEffect(() => {
    if (!pair || !activeRate || activeRate.currency_pair_uuid !== pairUuid) return;

    // Estrenar par (o su tasa) arranca el cajón en la tasa del par. El efecto no depende de
    // `manualRate`, así que no vuelve a correr cuando el operador fija la suya.
    if (pairEffectiveRate) {
      setRateInput(formatRateForInput(pairEffectiveRate));
      setMarginInput(
        baseEffectiveRate ? formatMarginForInput((1 - pairEffectiveRate / baseEffectiveRate) * 100) : '',
      );
    }

    if (payment.amount == null) return;
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0 || activeRate.rate <= 0) return;

    const cur = (payment.currency || '').toUpperCase();
    // El lado que trae el comprobante es el input de la cotización: si el pago está en la
    // moneda de origen se cotiza SEND, y si está en la de destino, RECEIVE.
    if (cur === fromCur.toUpperCase()) {
      const quoted = quotePair(amount, activeRate.rate, activeRate.inverse_percentage, 'SEND', rounding);
      setFromAmount(formatAmountForInput(quoted.fromAmount));
      setToAmount(formatAmountForInput(quoted.toAmount));
    } else if (cur === toCur.toUpperCase()) {
      const quoted = quotePair(amount, activeRate.rate, activeRate.inverse_percentage, 'RECEIVE', rounding);
      setFromAmount(formatAmountForInput(quoted.fromAmount));
      setToAmount(formatAmountForInput(quoted.toAmount));
    }
  }, [
    activeRate,
    pair,
    pairUuid,
    payment.amount,
    payment.currency,
    fromCur,
    toCur,
    rounding,
    pairEffectiveRate,
    baseEffectiveRate,
  ]);

  /**
   * El margen que sale de lo escrito: la tasa a la que se le está pagando al cliente contra
   * la tasa base del par. Es el mismo cálculo que hace el backend al crear la operación
   * (`implied_margin`), así que lo que se ve aquí es lo que va a quedar registrado.
   */
  const rawMargin = (() => {
    if (!baseEffectiveRate) return null;
    // Sobre los montos que se van a MANDAR, no sobre los que se ven: el lado calculado viaja
    // sin recortar, y es su cociente el que el backend va a leer como margen.
    const from = derivedExact != null && anchorSide === 'RECEIVE' ? derivedExact : Number(fromAmount);
    const to = derivedExact != null && anchorSide === 'SEND' ? derivedExact : Number(toAmount);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to <= 0) return null;
    const margin = (1 - to / from / baseEffectiveRate) * 100;
    // Cuatro decimales, los mismos que redondea el backend: a dos, un −0,0007% se vería como
    // un 0,00% que el backend en realidad va a descartar.
    return Number.isFinite(margin) ? normalizeZero(Math.round(margin * 10000) / 10000) : null;
  })();

  /**
   * El margen que el backend va a registrar de verdad. `implied_margin` solo acepta lo que
   * parece un margen comercial: el 0 exacto sí, pero un negativo o un ≥99% los descarta y la
   * operación nace sin margen deducido. El cartel dice cuál de las dos cosas va a pasar.
   */
  const registeredMargin =
    rawMargin == null ? null : rawMargin === 0 ? 0 : rawMargin > 0 && rawMargin < 99 ? rawMargin : null;

  const creationStatus = table === 'incoming'
    ? { label: 'Pendiente', detail: 'Se completará al vincular el pago saliente.' }
    : fromCur.toUpperCase() === 'USD'
      ? { label: 'Pendiente', detail: 'Quedará pendiente hasta confirmar la entrega del efectivo.' }
      : { label: 'Completada', detail: 'Este pago saliente confirma que el dinero fue entregado.' };

  const sanitizeAndSetAmount = (value: string, setter: (next: string) => void) => {
    const sanitized = sanitizeAmountInput(value);
    if (sanitized !== null) setter(sanitized);
    return sanitized;
  };

  /**
   * Cotiza con la tasa que manda. Con tasa propia no se aplica el redondeo del par: el
   * operador escribió el número exacto que quiere que quede registrado, y redondearlo por
   * encima le movería el margen que acaba de fijar.
   */
  const quoteWithCurrentRate = (amount: number, side: AmountSide) => {
    if (manualRate != null) return quotePair(amount, manualRate, false, side, null);
    if (!activeRate) return null;
    return quotePair(amount, activeRate.rate, activeRate.inverse_percentage, side, rounding);
  };

  const updateFromAmount = (value: string) => {
    const sanitized = sanitizeAndSetAmount(value, setFromAmount);
    if (sanitized === null || !activeRate || !effectiveRate || !Number.isFinite(effectiveRate) || effectiveRate <= 0) return;

    // Escribir un monto a mano es tomar el control de los dos lados: se manda lo escrito.
    setDerivedExact(null);

    if (sanitized === '') {
      setToAmount('');
      return;
    }

    const amount = Number(sanitized);
    if (!Number.isFinite(amount)) return;
    const quoted = quoteWithCurrentRate(amount, 'SEND');
    if (quoted) setToAmount(formatAmountForInput(quoted.toAmount));
  };

  const updateToAmount = (value: string) => {
    const sanitized = sanitizeAndSetAmount(value, setToAmount);
    if (sanitized === null || !activeRate || !effectiveRate || !Number.isFinite(effectiveRate) || effectiveRate <= 0) return;

    setDerivedExact(null);

    if (sanitized === '') {
      setFromAmount('');
      return;
    }

    const amount = Number(sanitized);
    if (!Number.isFinite(amount)) return;
    const quoted = quoteWithCurrentRate(amount, 'RECEIVE');
    if (quoted) setFromAmount(formatAmountForInput(quoted.fromAmount));
  };

  /**
   * Re-cotiza los montos con una tasa nueva dejando quieto el lado del comprobante, y guarda
   * el lado calculado sin recortar para que el margen llegue entero al backend.
   */
  const requote = (rate: number, fromPair = false) => {
    const anchor = Number((anchorSide === 'SEND' ? fromAmount : toAmount).replace(',', '.'));
    if (!Number.isFinite(anchor) || anchor <= 0) return;
    const quoted =
      fromPair && activeRate
        ? quotePair(anchor, activeRate.rate, activeRate.inverse_percentage, anchorSide, rounding)
        : Number.isFinite(rate) && rate > 0
          ? quotePair(anchor, rate, false, anchorSide, null)
          : null;
    if (!quoted) return;
    setFromAmount(formatAmountForInput(quoted.fromAmount));
    setToAmount(formatAmountForInput(quoted.toAmount));
    setDerivedExact(anchorSide === 'SEND' ? quoted.toAmount : quoted.fromAmount);
  };

  const updateRate = (value: string) => {
    const sanitized = sanitizeRateInput(value);
    if (sanitized === null) return;
    setRateInput(sanitized);

    const rate = Number(sanitized);
    if (sanitized === '' || !Number.isFinite(rate) || rate <= 0) return;
    setManualRate(rate);
    setRoundedTo(null);
    if (baseEffectiveRate) setMarginInput(formatMarginForInput((1 - rate / baseEffectiveRate) * 100));
    requote(rate);
  };

  const updateMargin = (value: string) => {
    const sanitized = sanitizeMarginInput(value);
    if (sanitized === null) return;
    setMarginInput(sanitized);

    const margin = Number(sanitized);
    if (sanitized === '' || sanitized === '-' || !baseEffectiveRate) return;
    if (!Number.isFinite(margin) || margin >= 100) return;
    const rate = baseEffectiveRate * (1 - margin / 100);
    if (!Number.isFinite(rate) || rate <= 0) return;
    setManualRate(rate);
    setRoundedTo(null);
    setRateInput(formatRateForInput(rate));
    requote(rate);
  };

  /** Devuelve la operación a la tasa del par: deja de tener tasa propia. */
  const resetToPairRate = () => {
    if (!pairEffectiveRate) return;
    setManualRate(null);
    setRoundedTo(null);
    setRateInput(formatRateForInput(pairEffectiveRate));
    setMarginInput(
      baseEffectiveRate ? formatMarginForInput((1 - pairEffectiveRate / baseEffectiveRate) * 100) : '',
    );
    requote(pairEffectiveRate, true);
  };

  /** Cotiza a la tasa base: sin margen, que es como se registra lo personal. */
  const useBaseRate = () => {
    if (!baseEffectiveRate) return;
    setManualRate(baseEffectiveRate);
    setRoundedTo(null);
    setRateInput(formatRateForInput(baseEffectiveRate));
    setMarginInput('0');
    requote(baseEffectiveRate);
  };

  /**
   * Montos redondos para el lado libre — el que NO trae el comprobante.
   *
   * Solo hay fila si el par define un múltiplo de negociación Y ese múltiplo está en la
   * moneda del lado libre: si el comprobante ya fija esa moneda, no hay nada que redondear.
   */
  const roundSuggestions = useMemo(() => {
    if (!pair) return [];
    const stepSide = pair.negotiation_step_side;
    const freeIsFrom = anchorSide === 'RECEIVE';
    if (!stepSide || (freeIsFrom ? stepSide !== 'FROM' : stepSide !== 'TO')) return [];

    const anchorAmount = Number((anchorSide === 'SEND' ? fromAmount : toAmount).replace(',', '.'));
    const typedFree = Number((freeIsFrom ? fromAmount : toAmount).replace(',', '.'));
    // El lado calculado sin recortar es más fiel que lo que se ve en el campo.
    const freeAmount = derivedExact ?? typedFree;

    return roundOptions({
      anchorAmount,
      freeAmount,
      anchorSide,
      step: pair.negotiation_step,
      baseEffectiveRate,
      currentMargin: rawMargin,
    });
  }, [pair, anchorSide, fromAmount, toAmount, derivedExact, baseEffectiveRate, rawMargin]);

  /** La moneda en la que se está negociando, para etiquetar la fila y los chips. */
  const freeCur = anchorSide === 'RECEIVE' ? fromCur : toCur;

  /**
   * Elegir un chip es exactamente fijar la tasa a mano: el lado del comprobante no se
   * mueve, así que llevar el otro a un número redondo cambia la tasa del trato.
   */
  const applyRoundAmount = (option: RoundOption) => {
    setManualRate(option.rate);
    setRoundedTo(option.amount);
    setRateInput(formatRateForInput(option.rate));
    if (baseEffectiveRate) {
      setMarginInput(formatMarginForInput((1 - option.rate / baseEffectiveRate) * 100));
    }
    requote(option.rate);
  };

  const withFund = direction === 'SEND';
  // Los fondos que el par sugiere y —aparte, no descartados— todos los demás: el paso los
  // lista en dos secciones y así «Cambiar» siempre tiene algo que ofrecer.
  const { suggested: fundOptions, others: otherFunds } = useMemo(
    () => splitFundOptions(groups, fromCur, toCur, payment.fund_group_uuid, fundGroupUuid),
    [groups, fromCur, toCur, payment.fund_group_uuid, fundGroupUuid],
  );
  const selectedGroup = useMemo(() => groups.find((g) => g.uuid === fundGroupUuid), [groups, fundGroupUuid]);

  /**
   * Elige fondo y, con él, su gestor por defecto (el `is_fund_manager`, o el primero). Lo
   * llaman los chips, explícitamente, en vez de vivir en un efecto: `FundStep` ya manda el
   * gestor exacto que se eligió ahí, y un efecto disparado por `selectedGroup` se lo pisaría
   * de vuelta al confirmar un gestor que no es el del fondo.
   */
  const selectFund = (groupUuid: string) => {
    setFundGroupUuid(groupUuid);
    const group = groups.find((g) => g.uuid === groupUuid);
    setExchangeUserUuid(defaultManagerFor(group)?.user_uuid ?? '');
  };

  /**
   * Cuánto del sobrante puede irse al saldo del cliente. Solo con comprobante ENTRANTE: ahí
   * el que pagó de más es el cliente y el saldo queda a su favor. Si la casa pagó de más, lo
   * que queda es una deuda, y eso no se abre desde aquí. El ledger es en USD, así que solo
   * los métodos que liquidan en USD pueden alimentarlo.
   */
  const creditableUsd = (_diffValue: number, diffPayment: number) => {
    if (table !== 'incoming') return null;
    if (settleCurrency(payment.currency || '') !== 'USD') return null;
    const amount = Math.round(diffPayment * 100) / 100;
    return amount > 0 ? amount : null;
  };

  /**
   * Lo que queda escrito cuando la tasa no es la del par. Sin esto, dentro de un mes nadie
   * distingue un 0% decidido —«esto es personal, no le cobro»— de un error de tecleo.
   */
  const manualRateNote = (): string | null => {
    if (manualRate == null || !effectiveRate) return null;
    const rate = effectiveRate.toLocaleString('es-VE', { maximumFractionDigits: 6 });
    const margin =
      registeredMargin != null
        ? `${registeredMargin.toLocaleString('es-VE', { maximumFractionDigits: 2 })}%`
        : 'sin margen deducible';
    return `Tasa fijada a mano: 1 ${fromCur} = ${rate} ${toCur} (margen ${margin}).`;
  };

  const createOperation = async (
    fa: number,
    ta: number,
    notes: string | null,
    creditUsd: number | null,
  ) => {
    setCreating(true);
    const rateNote = manualRateNote();
    const finalNotes = [rateNote, notes].filter(Boolean).join(' ') || null;
    const res = await paymentService.createOperation(table, payment.id, {
      fromCurrency: fromCur,
      toCurrency: toCur,
      fromAmount: fa,
      toAmount: ta,
      amountSide: direction,
      fundGroupUuid: withFund ? fundGroupUuid || null : null,
      exchangeUserUuid: withFund && fundGroupUuid ? exchangeUserUuid || null : null,
      notes: finalNotes,
    });
    if (!res.success) {
      setCreating(false);
      return toast.error(res.error || 'No se pudo crear la operación');
    }

    // El crédito va DESPUÉS de la operación y aparte: si falla, la operación ya existe y lo
    // que queda es un sobrante sin asignar, que es justo lo que el operador ve y puede
    // resolver a mano. Callarlo sería peor.
    if (creditUsd != null) {
      const credit = await paymentService.creditBalance(payment.id, {
        amount: creditUsd,
        notes: 'Sobrante del comprobante al crear la operación',
      });
      if (!credit.success) {
        setCreating(false);
        toast.error(
          credit.error || 'La operación se creó, pero el sobrante no se pudo acreditar al saldo',
        );
        onSuccess();
        return;
      }
    }

    setCreating(false);
    toast.success(
      creditUsd != null
        ? 'Operación creada y sobrante acreditado al saldo'
        : 'Operación creada y vinculada al pago',
    );
    onSuccess();
  };

  const submit = () => {
    const typedFrom = parseFloat(fromAmount.replace(',', '.'));
    const typedTo = parseFloat(toAmount.replace(',', '.'));
    if (!pair) return toast.error('Selecciona un par');
    if (!Number.isFinite(typedFrom) || typedFrom <= 0 || !Number.isFinite(typedTo) || typedTo <= 0) {
      return toast.error('Ingresa montos válidos (> 0)');
    }
    // El lado calculado va entero: el campo muestra 172,07 pero lo que cotizó la tasa son
    // 172,072948, y de ese cociente sale el margen que el backend registra.
    const fa = derivedExact != null && anchorSide === 'RECEIVE' ? derivedExact : typedFrom;
    const ta = derivedExact != null && anchorSide === 'SEND' ? derivedExact : typedTo;

    // El valor no cuadra con el comprobante: puede ser a propósito (el cliente cambia solo una
    // parte, o este pago cubre menos de lo que vale el trato), pero nunca en silencio. En vez
    // de un aviso encima del cajón, el cuerpo pasa al paso que plantea la decisión.
    const diff =
      effectiveRate && effectiveRate > 0 && payment.amount != null
        ? buildValueDifference({
            table,
            paymentAmount: Number(payment.amount),
            paymentCurrency: payment.currency || '',
            valueCurrency: fromCur,
            counterCurrency: toCur,
            rate: effectiveRate,
            typedValue: fa,
            // Con tasa propia el redondeo del par ya no se aplicó, así que su holgura
            // tampoco: la única diferencia tolerable vuelve a ser el céntimo.
            rounding: manualRate != null ? null : rounding,
            creditableUsd,
          })
        : null;

    if (diff) {
      // Sin opciones que ofrecer (falta dinero, o la diferencia huele a tecleo) el paso solo
      // informa: la única salida que crea algo lo hace con lo que el operador escribió.
      setChoice(differenceChoices(diff)[0] ?? 'keep');
      setDifference(diff);
      return;
    }

    createOperation(fa, ta, null, null);
  };

  /** Aplica lo que el operador eligió en el paso de la diferencia y crea la operación. */
  const confirmDifference = () => {
    if (!difference) return;
    const typedFrom = parseFloat(fromAmount.replace(',', '.'));
    const typedTo = parseFloat(toAmount.replace(',', '.'));

    if (choice === 'raise') {
      // Subir la operación al comprobante entero. Se manda sin recortar decimales para que la
      // tasa que quede grabada sea EXACTAMENTE la cotizada, no una aproximada al céntimo.
      const fa = difference.receiptValue;
      const ta = difference.onCounterSide ? difference.paymentAmount : fa * (effectiveRate || 0);
      return createOperation(fa, ta, null, null);
    }
    if (choice === 'balance') {
      return createOperation(typedFrom, typedTo, null, difference.creditableUsd);
    }
    if (choice === 'partial') {
      // Se crea como se escribió: la operación pide más de lo entregado y espera el resto.
      return createOperation(typedFrom, typedTo, null, null);
    }
    if (difference.kind === 'short') {
      // Se pagó de menos y la diferencia se deja de ganancia: lo ENTREGADO baja a lo que dice
      // el comprobante, y el valor del trato no se toca. La tasa efectiva sube sola, y con
      // ella el margen que el backend deduce de los montos.
      return createOperation(
        typedFrom,
        difference.paymentAmount,
        differenceNote(difference, 'keep'),
        null,
      );
    }
    return createOperation(typedFrom, typedTo, differenceNote(difference, 'keep'), null);
  };

  if (difference) {
    return (
      <ValueDifferenceStep
        difference={difference}
        choice={choice}
        onChoice={setChoice}
        onBack={() => setDifference(null)}
        onConfirm={confirmDifference}
        submitting={creating}
      />
    );
  }

  if (loadingData) {
    return (
      <>
        <SidePanelBody className="justify-center">
          <LoadingState label="Cargando datos de la operación…" />
        </SidePanelBody>
        <SidePanelFooter>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Button disabled>
            <Plus className="h-4 w-4" />
            Crear operación
          </Button>
        </SidePanelFooter>
      </>
    );
  }

  if (showFundStep) {
    return (
      <FundStep
        suggested={fundOptions}
        others={otherFunds}
        initialGroupUuid={fundGroupUuid}
        initialManagerUuid={exchangeUserUuid}
        paymentFundGroupUuid={payment.fund_group_uuid}
        fromCur={fromCur}
        toCur={toCur}
        onBack={() => setShowFundStep(false)}
        onConfirm={(groupUuid, managerUuid) => {
          setFundGroupUuid(groupUuid);
          setExchangeUserUuid(managerUuid);
          setShowFundStep(false);
        }}
      />
    );
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!creating && pairUuid) submit();
      }}
    >
      <SidePanelBody className="gap-0 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="op-pair">Par de la cotización</Label>
          <PairPicker
            id="op-pair"
            pairs={pairs}
            value={pairUuid}
            onChange={setPairUuid}
            preferredUuid={preferredUuid}
            clientName={clientName}
            usage={pairUsage}
            rates={pairRates}
            totalOperations={clientOps}
          />
        </div>

        {pair && (activeRate || rateError) ? (
          <div className="space-y-2">
            {/* La línea: el dato que el operador sí necesita ver cabe en 44 px. */}
            <div
              className={cn(
                'flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border px-3 py-2',
                rateError
                  ? 'border-destructive/30 bg-destructive/10'
                  : manualRate != null || rateIsHistoric
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-border bg-card',
              )}
            >
              <span className="flex min-w-0 flex-col">
                {rateError ? (
                  <span className="text-sm font-medium text-destructive">
                    Sin tasa activa para {fromCur}/{toCur}
                  </span>
                ) : loadingRate ? (
                  <span className="text-sm text-muted-foreground">
                    Calculando con la tasa del comprobante…
                  </span>
                ) : (
                  <span className="text-sm text-foreground tabular-nums">
                    1 {fromCur} ={' '}
                    <strong className="font-bold">
                      {effectiveRate && Number.isFinite(effectiveRate)
                        ? effectiveRate.toLocaleString('es-VE', { maximumFractionDigits: 6 })
                        : '—'}
                    </strong>{' '}
                    {toCur}
                  </span>
                )}
                <span
                  className={cn(
                    'text-xs',
                    rateError
                      ? 'text-destructive'
                      : manualRate != null || rateIsHistoric
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-muted-foreground',
                  )}
                >
                  {rateError
                    ? 'escribe los dos montos a mano; la operación nacerá sin margen deducido'
                    : rateIsHistoric && manualRate == null
                      ? 'tasa del día del comprobante, no la de hoy'
                      : [
                          roundedTo != null
                            ? `fijada al redondear a ${formatAmountForInput(roundedTo)} ${freeCur}`
                            : manualRate != null
                              ? 'fijada a mano'
                              : null,
                          registeredMargin != null
                            ? `margen ${registeredMargin.toLocaleString('es-VE', { maximumFractionDigits: 2 })} %`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'la tasa del par'}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                {!rateError && manualRate == null && !rateIsHistoric ? (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-emerald-700 dark:text-emerald-400">
                    DEL PAR
                  </span>
                ) : null}
                {manualRate != null && pairEffectiveRate ? (
                  <Button type="button" variant="ghost" size="sm" className="h-8" onClick={resetToPairRate}>
                    Volver a la del par
                  </Button>
                ) : null}
                {!rateEditorOpen ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-primary"
                    onClick={() => setShowRateEditor(true)}
                  >
                    Ajustar
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                ) : !rateError ? (
                  // Sin tasa activa el editor no se puede cerrar: es el único camino.
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-primary"
                    onClick={() => setShowRateEditor(false)}
                  >
                    Cerrar
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                ) : null}
              </span>
            </div>

            {/* Solo sobrevive el cartel que sí es noticia: el margen que NO se registra. */}
            {rawMargin !== null && registeredMargin === null ? (
              <p className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {rawMargin < 0
                    ? `Le estás pagando por encima de la tasa (${rawMargin.toLocaleString('es-VE', { maximumFractionDigits: 2 })} %): la operación va a perder y no se registra margen.`
                    : 'La tasa no se parece a la del par: la operación va a nacer sin margen.'}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {pair && activeRate && rateEditorOpen ? (
          <div className="space-y-2 rounded-lg border border-primary/40 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="op-rate">
                  Tasa {fromCur && toCur ? `(1 ${fromCur} → ${toCur})` : ''}
                </Label>
                <Input
                  id="op-rate"
                  inputMode="decimal"
                  value={rateInput}
                  onChange={(e) => updateRate(e.target.value)}
                  placeholder="0.00"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-margin">Margen %</Label>
                <Input
                  id="op-margin"
                  inputMode="decimal"
                  value={marginInput}
                  onChange={(e) => updateMargin(e.target.value)}
                  placeholder="0.00"
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={resetToPairRate}
                disabled={manualRate == null || !pairEffectiveRate}
              >
                Tasa del par
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={useBaseRate}
                disabled={!baseEffectiveRate}
              >
                Personal · sin margen
              </Button>
              {baseEffectiveRate ? (
                <span className="text-xs text-muted-foreground">
                  base {baseEffectiveRate.toLocaleString('es-VE', { maximumFractionDigits: 6 })}
                  {activeRate.percentage != null ? ` · el par cobra ${activeRate.percentage}%` : ''}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="op-from">Valor {fromCur || 'origen'}</Label>
            <Input
              id="op-from"
              inputMode="decimal"
              value={fromAmount}
              onChange={(e) => updateFromAmount(e.target.value)}
              placeholder="0.00"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="op-to">Equivale a {toCur || 'destino'}</Label>
            <Input
              id="op-to"
              inputMode="decimal"
              value={toAmount}
              onChange={(e) => updateToAmount(e.target.value)}
              placeholder="0.00"
              className="h-10"
            />
          </div>
        </div>

        {roundSuggestions.length > 0 ? (
          <div className="-mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              Redondear a{' '}
              <strong className="font-bold text-foreground tabular-nums">
                {formatAmountForInput(pair!.negotiation_step!)}
              </strong>
            </span>
            {roundSuggestions.map((option) => (
              <button
                key={option.amount}
                type="button"
                onClick={() => applyRoundAmount(option)}
                title={`Deja la tasa en ${option.rate.toLocaleString('es-VE', { maximumFractionDigits: 6 })} ${toCur} por ${fromCur}`}
                className={cn(
                  'flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 whitespace-nowrap transition-colors sm:min-h-8',
                  option.recommended
                    ? 'border-primary bg-card'
                    : option.registers
                      ? 'border-border bg-card hover:bg-muted/60'
                      : 'border-destructive/40 bg-card hover:bg-destructive/5',
                )}
              >
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {formatAmountForInput(option.amount)}
                </span>
                <span
                  className={cn(
                    'text-xs font-bold tabular-nums',
                    option.registers
                      ? option.recommended
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                      : 'text-destructive',
                  )}
                >
                  {option.margin > 0 ? '+' : ''}
                  {option.margin.toLocaleString('es-VE', { maximumFractionDigits: 2 })} %
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {withFund ? (
          fundFieldMode(fundOptions.length) === 'chips' ? (
            <FundChips
              candidates={fundOptions}
              selectedGroupUuid={fundGroupUuid}
              selectedManagerUuid={exchangeUserUuid}
              otherCount={otherFunds.length}
              onSelectGroup={selectFund}
              onSelectManager={setExchangeUserUuid}
              onOpenStep={() => setShowFundStep(true)}
            />
          ) : (
            <FundManagerField
              pairSelected={!!pair}
              suggested={fundOptions}
              others={otherFunds}
              selectedGroup={selectedGroup}
              selectedManagerUuid={exchangeUserUuid}
              fromCur={fromCur}
              toCur={toCur}
              paymentFundGroupUuid={payment.fund_group_uuid}
              onOpenStep={() => setShowFundStep(true)}
            />
          )
        ) : null}

        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Opciones avanzadas
          </button>
          {showAdvanced ? (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="op-direction">Dirección</Label>
              <Select value={direction} onValueChange={(v) => setDirection((v as 'SEND' | 'RECEIVE') ?? 'SEND')}>
                <SelectTrigger id="op-direction" className="h-10 w-full">
                  <SelectValue>{direction === 'SEND' ? 'Salida' : 'Entrada'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEND">Salida</SelectItem>
                  <SelectItem value="RECEIVE">Entrada</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Las salientes casi siempre son “Salida”. El fondo solo aplica en salida.
              </p>
            </div>
          ) : null}
        </div>
      </SidePanelBody>

      <SidePanelFooter>
        {/*
          Es la consecuencia de pulsar el botón, así que se lee junto al botón y no
          300 px más arriba. `w-full` le da su propia fila sin romper los dos botones.
        */}
        {pair ? (
          <p className="w-full text-xs text-muted-foreground">
            Se creará <span className="font-semibold text-foreground">{creationStatus.label}</span>
            {' — '}
            {creationStatus.detail}
          </p>
        ) : null}
        <Button variant="ghost" onClick={onBack} disabled={creating}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <Button type="submit" disabled={creating || !pairUuid}>
          <Plus className="h-4 w-4" />
          {creating ? 'Creando…' : 'Crear operación'}
        </Button>
      </SidePanelFooter>
    </form>
  );
}
