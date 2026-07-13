'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, ChevronDown, ChevronRight, CircleAlert, Info, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DialogFooter } from '@/components/ui/dialog';
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
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { fundService } from '@/services/fundService';
import { paymentService } from '@/services/paymentService';
import { ratesService } from '@/services/ratesService';
import type { CurrencyPairData } from '@/types/admin';
import type { ExchangeRateResponse } from '@/types/currency';
import type { FundGroup } from '@/types/fund';
import type { PaymentData, PaymentTable } from '@/types/payment';
import { formatAmountForInput, sanitizeAmountInput } from '@/utils/functions';

interface CreateOperationFormProps {
  payment: PaymentData;
  table: PaymentTable;
  onSuccess: () => void;
  onBack: () => void;
}

export function CreateOperationForm({ payment, table, onSuccess, onBack }: CreateOperationFormProps) {
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [groups, setGroups] = useState<FundGroup[]>([]);
  const [pairUuid, setPairUuid] = useState('');
  const [direction, setDirection] = useState<'SEND' | 'RECEIVE'>('SEND');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [activeRate, setActiveRate] = useState<ExchangeRateResponse | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [fundGroupUuid, setFundGroupUuid] = useState('');
  const [exchangeUserUuid, setExchangeUserUuid] = useState('');
  const [creating, setCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    Promise.all([
      adminService.getCurrencyPairs(0, 200, true),
      fundService.getGroups(),
      payment.client_uuid ? clientService.getClient(payment.client_uuid) : Promise.resolve(null),
    ]).then(([pairsRes, groupsRes, clientRes]) => {
      if (pairsRes.success && pairsRes.data) setPairs(pairsRes.data.pairs);
      if (groupsRes.success && groupsRes.data) setGroups(groupsRes.data.filter((g) => g.is_active));

      // Prefill: par por defecto del cliente (editable). Solo si aún no se eligió
      // uno y el par preferido está entre los pares activos.
      const preferred = clientRes?.success ? clientRes.data?.preferred_pair_uuid : null;
      if (preferred && pairsRes.success && pairsRes.data?.pairs.some((p) => p.uuid === preferred)) {
        setPairUuid((current) => current || preferred);
      }
    });
  }, [payment.client_uuid]);

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
    ratesService.getRateByPair(pairUuid).then((res) => {
      if (!active) return;
      setLoadingRate(false);
      if (res.success && res.data) {
        setActiveRate(res.data);
      } else {
        setActiveRate(null);
        setRateError(true);
      }
    });
    return () => {
      active = false;
    };
  }, [pairUuid]);

  // Prefill: el monto del pago va al lado cuya moneda coincide con la del pago.
  useEffect(() => {
    if (!pair || payment.amount == null) return;
    const cur = (payment.currency || '').toUpperCase();
    if (cur && cur === fromCur.toUpperCase()) setFromAmount(String(payment.amount));
    else if (cur && cur === toCur.toUpperCase()) setToAmount(String(payment.amount));
  }, [pair, payment.amount, payment.currency, fromCur, toCur]);

  // Misma orientación de tasa que usa la calculadora principal. El monto detectado
  // en el comprobante queda fijo y se calcula el lado opuesto; ambos campos siguen
  // siendo editables para que el operador pueda corregir el resultado.
  useEffect(() => {
    if (!pair || !activeRate || activeRate.currency_pair_uuid !== pairUuid || payment.amount == null) return;
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0 || activeRate.rate <= 0) return;

    const cur = (payment.currency || '').toUpperCase();
    if (cur === fromCur.toUpperCase()) {
      const calculated = activeRate.inverse_percentage ? amount / activeRate.rate : amount * activeRate.rate;
      setFromAmount(formatAmountForInput(amount));
      setToAmount(formatAmountForInput(calculated));
    } else if (cur === toCur.toUpperCase()) {
      const calculated = activeRate.inverse_percentage ? amount * activeRate.rate : amount / activeRate.rate;
      setFromAmount(formatAmountForInput(calculated));
      setToAmount(formatAmountForInput(amount));
    }
  }, [activeRate, pair, pairUuid, payment.amount, payment.currency, fromCur, toCur]);

  const effectiveRate = activeRate
    ? activeRate.inverse_percentage ? 1 / activeRate.rate : activeRate.rate
    : null;

  const creationStatus = table === 'incoming'
    ? { label: 'Pendiente', detail: 'Se completará al vincular el pago saliente.' }
    : fromCur.toUpperCase() === 'USD'
      ? { label: 'Pendiente', detail: 'Quedará pendiente hasta confirmar la entrega del efectivo.' }
      : { label: 'Completada', detail: 'Este pago saliente confirma que el dinero fue entregado.' };

  const updateAmount = (value: string, setter: (next: string) => void) => {
    const sanitized = sanitizeAmountInput(value);
    if (sanitized !== null) setter(sanitized);
  };

  const withFund = direction === 'SEND';
  // ZELLE/PAYPAL son métodos de pago en USD: para elegir fondo se liquidan como USD.
  const settle = (c: string) => (c?.toUpperCase() === 'ZELLE' || c?.toUpperCase() === 'PAYPAL' ? 'USD' : c?.toUpperCase());
  const fundOptions = useMemo(
    () =>
      groups.filter(
        (g) => g.currency && (settle(g.currency) === settle(fromCur) || settle(g.currency) === settle(toCur)),
      ),
    [groups, fromCur, toCur],
  );
  const selectedGroup = useMemo(() => groups.find((g) => g.uuid === fundGroupUuid), [groups, fundGroupUuid]);
  const members = selectedGroup?.members ?? [];

  // Al elegir fondo: default gestor = el is_fund_manager (o el primero).
  useEffect(() => {
    if (!selectedGroup) {
      setExchangeUserUuid('');
      return;
    }
    const mgr = members.find((m) => m.is_fund_manager) ?? members[0];
    setExchangeUserUuid(mgr?.user_uuid ?? '');
  }, [selectedGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const fa = parseFloat(fromAmount.replace(',', '.'));
    const ta = parseFloat(toAmount.replace(',', '.'));
    if (!pair) return toast.error('Selecciona un par');
    if (!Number.isFinite(fa) || fa <= 0 || !Number.isFinite(ta) || ta <= 0) {
      return toast.error('Ingresa montos válidos (> 0)');
    }
    setCreating(true);
    const res = await paymentService.createOperation(table, payment.id, {
      fromCurrency: fromCur,
      toCurrency: toCur,
      fromAmount: fa,
      toAmount: ta,
      amountSide: direction,
      fundGroupUuid: withFund ? fundGroupUuid || null : null,
      exchangeUserUuid: withFund && fundGroupUuid ? exchangeUserUuid || null : null,
    });
    setCreating(false);
    if (res.success) {
      toast.success('Operación creada y vinculada al pago');
      onSuccess();
    } else {
      toast.error(res.error || 'No se pudo crear la operación');
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-1 py-1">
        <div className="space-y-1.5">
          <Label htmlFor="op-pair">Par</Label>
          <Select value={pairUuid} onValueChange={(v) => setPairUuid(v ?? '')}>
            <SelectTrigger id="op-pair" className="h-10 w-full">
              <SelectValue>{pair?.pair_symbol ?? 'Selecciona el par'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pairs.map((p) => (
                <SelectItem key={p.uuid} value={p.uuid}>{p.pair_symbol}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="op-from">Monto {fromCur || 'origen'}</Label>
            <Input
              id="op-from"
              inputMode="decimal"
              value={fromAmount}
              onChange={(e) => updateAmount(e.target.value, setFromAmount)}
              placeholder="0.00"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="op-to">Monto {toCur || 'destino'}</Label>
            <Input
              id="op-to"
              inputMode="decimal"
              value={toAmount}
              onChange={(e) => updateAmount(e.target.value, setToAmount)}
              placeholder="0.00"
              className="h-10"
            />
          </div>
        </div>

        {pair ? (
          <div className="flex gap-2.5 rounded-lg border border-border bg-muted/35 px-3 py-2.5 text-xs">
            {rateError ? (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">
                {loadingRate
                  ? 'Calculando con la tasa actual…'
                  : rateError
                    ? 'No hay una tasa activa para este par'
                    : 'Monto calculado con la tasa actual'}
              </p>
              <p className="text-muted-foreground">
                {effectiveRate && Number.isFinite(effectiveRate)
                  ? `1 ${fromCur} = ${effectiveRate.toLocaleString('es-VE', { maximumFractionDigits: 6 })} ${toCur}. Puedes modificar los montos antes de crear.`
                  : 'Puedes indicar ambos montos manualmente.'}
              </p>
            </div>
          </div>
        ) : null}

        {pair ? (
          <div className="flex gap-2.5 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2.5 text-xs">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
            <p className="text-muted-foreground">
              Estado al crear: <span className="font-semibold text-foreground">{creationStatus.label}</span>.{' '}
              {creationStatus.detail}
            </p>
          </div>
        ) : null}

        {withFund ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="op-fund">Fondo (opcional)</Label>
              <Select value={fundGroupUuid} onValueChange={(v) => setFundGroupUuid(v ?? '')} disabled={!pair}>
                <SelectTrigger id="op-fund" className="h-10 w-full">
                  <SelectValue>
                    {selectedGroup
                      ? `${selectedGroup.name}${selectedGroup.currency ? ` · ${selectedGroup.currency}` : ''}`
                      : pair ? 'Sin fondo' : 'Elige un par primero'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {fundOptions.map((g) => (
                    <SelectItem key={g.uuid} value={g.uuid}>
                      {g.name}{g.currency ? ` · ${g.currency}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pair && fundOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay fondos para {fromCur}/{toCur}.</p>
              ) : null}
            </div>

            {fundGroupUuid ? (
              <div className="space-y-1.5">
                <Label htmlFor="op-gestor">Gestor (movimiento del fondo)</Label>
                <Select value={exchangeUserUuid} onValueChange={(v) => setExchangeUserUuid(v ?? '')}>
                  <SelectTrigger id="op-gestor" className="h-10 w-full">
                    <SelectValue>
                      {members.find((m) => m.user_uuid === exchangeUserUuid)?.username ?? 'Selecciona el gestor'}
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
            ) : null}
          </>
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
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button variant="ghost" onClick={onBack} disabled={creating}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <Button onClick={submit} disabled={creating || !pairUuid}>
          <Plus className="h-4 w-4" />
          {creating ? 'Creando…' : 'Crear operación'}
        </Button>
      </DialogFooter>
    </>
  );
}
