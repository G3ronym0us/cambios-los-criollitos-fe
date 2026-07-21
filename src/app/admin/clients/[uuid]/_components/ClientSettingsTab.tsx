'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { CurrencyPairData } from '@/types/admin';
import type { ClientData, ClientUpdate } from '@/types/client';
import { DEFAULT_PAYMENT_CURRENCIES, sameBlock } from '@/utils/paymentBlock';

// Centinela para "sin par preferido" (el Select no admite value="").
const NO_PAIR = '__none__';
// Centinela para "sin moneda" en el Select de datos de pago.
const NO_CURRENCY = '__none__';

interface PendingChange {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'default' | 'destructive';
  successMessage: string;
  payload: ClientUpdate;
}

interface ClientSettingsTabProps {
  client: ClientData;
  pairs: CurrencyPairData[];
  saving: boolean;
  onSave: (data: ClientUpdate, successMessage?: string) => Promise<boolean>;
}

export function ClientSettingsTab({ client, pairs, saving, onSave }: ClientSettingsTabProps) {
  // Datos (nombre + par) → edición agrupada con un solo "Guardar cambios".
  const [name, setName] = useState(client.display_name ?? '');
  const [pair, setPair] = useState(client.preferred_pair_uuid ?? NO_PAIR);
  const [pending, setPending] = useState<PendingChange | null>(null);

  // Datos de pago predeterminados → edición agrupada con su propio "Guardar".
  const [paymentInfo, setPaymentInfo] = useState(client.default_payment_info ?? '');
  const [paymentCurrency, setPaymentCurrency] = useState(client.default_payment_currency ?? NO_CURRENCY);

  // Re-sincroniza el formulario de datos cuando el cliente cambia (tras guardar).
  useEffect(() => {
    setName(client.display_name ?? '');
    setPair(client.preferred_pair_uuid ?? NO_PAIR);
  }, [client.display_name, client.preferred_pair_uuid]);

  useEffect(() => {
    setPaymentInfo(client.default_payment_info ?? '');
    setPaymentCurrency(client.default_payment_currency ?? NO_CURRENCY);
  }, [client.default_payment_info, client.default_payment_currency]);

  const savedPair = client.preferred_pair_uuid ?? NO_PAIR;
  const nameDirty = name.trim() !== (client.display_name ?? '');
  const pairDirty = pair !== savedPair;
  const dataDirty = nameDirty || pairDirty;

  const pairLabel = (value: string) => {
    if (value === NO_PAIR) return 'Sin par preferido';
    return pairs.find((p) => p.uuid === value)?.pair_symbol ?? client.preferred_pair_symbol ?? value;
  };

  const resetData = () => {
    setName(client.display_name ?? '');
    setPair(savedPair);
  };

  const savedPaymentInfo = client.default_payment_info ?? '';
  const savedPaymentCurrency = client.default_payment_currency ?? NO_CURRENCY;
  const paymentInfoDirty = !sameBlock(paymentInfo, savedPaymentInfo);
  const paymentCurrencyDirty = paymentCurrency !== savedPaymentCurrency;
  const paymentDirty = paymentInfoDirty || paymentCurrencyDirty;

  const resetPayment = () => {
    setPaymentInfo(savedPaymentInfo);
    setPaymentCurrency(savedPaymentCurrency);
  };

  const confirmPending = async () => {
    if (!pending) return;
    const ok = await onSave(pending.payload, pending.successMessage);
    if (ok) setPending(null);
  };

  // Guardar nombre + par juntos (solo los campos que cambiaron).
  const askSaveData = () => {
    const value = name.trim();
    const payload: ClientUpdate = {};
    const changes: string[] = [];
    if (nameDirty) {
      payload.display_name = value || null;
      changes.push(value ? `Nombre → "${value}"` : 'Nombre → (sin nombre, usa el número)');
    }
    if (pairDirty) {
      payload.preferred_pair_uuid = pair === NO_PAIR ? null : pair;
      changes.push(`Par por defecto → ${pairLabel(pair)}`);
    }
    if (changes.length === 0) return;
    setPending({
      title: 'Guardar cambios',
      description: changes.join(' · '),
      confirmLabel: 'Guardar',
      successMessage: 'Datos actualizados',
      payload,
    });
  };

  // Guardar datos de pago predeterminados (bloque + moneda), mostrando el diff.
  const askSavePayment = () => {
    const info = paymentInfo.trim();
    const currency = paymentCurrency === NO_CURRENCY ? null : paymentCurrency;
    // Datos sin moneda son inertes: el bot solo los inyecta si la moneda guardada
    // es la que el cliente recibe. Guardar así daría una falsa sensación de configurado.
    if (info && !currency) {
      toast.error('Elige la moneda de la cuenta');
      return;
    }
    const payload: ClientUpdate = {
      default_payment_info: info || null,
      default_payment_currency: currency,
    };
    const from = savedPaymentInfo
      ? `${savedPaymentInfo}${savedPaymentCurrency !== NO_CURRENCY ? ` (${savedPaymentCurrency})` : ''}`
      : '(sin datos)';
    const to = info
      ? `${info}${currency ? ` (${currency})` : ''}`
      : '(sin datos)';
    setPending({
      title: 'Guardar datos de pago',
      description: `${from}  →  ${to}`,
      confirmLabel: 'Guardar',
      successMessage: 'Datos de pago actualizados',
      payload,
    });
  };

  // Switches → confirmación individual (uno por uno).
  const askToggle = (
    key: 'is_tracked' | 'is_usdt_authorized' | 'is_blocked',
    next: boolean,
    label: string
  ) => {
    const copy: Record<typeof key, { on: string; off: string; okOn: string; okOff: string }> = {
      is_tracked: {
        on: 'El cliente aparecerá en el seguimiento del operador.',
        off: 'El cliente dejará de aparecer en el seguimiento.',
        okOn: 'Cliente en seguimiento',
        okOff: 'Seguimiento desactivado',
      },
      is_usdt_authorized: {
        on: 'El cliente podrá cotizar pares con USDT a tasa de mercado.',
        off: 'El cliente ya no podrá cotizar pares con USDT.',
        okOn: 'USDT autorizado',
        okOff: 'USDT desautorizado',
      },
      is_blocked: {
        on: 'El bot ignorará los mensajes de este cliente.',
        off: 'El bot volverá a responder a este cliente.',
        okOn: 'Cliente bloqueado',
        okOff: 'Cliente desbloqueado',
      },
    };
    const c = copy[key];
    setPending({
      title: `${next ? 'Activar' : 'Desactivar'} ${label.toLowerCase()}`,
      description: next ? c.on : c.off,
      confirmLabel: next ? 'Activar' : 'Desactivar',
      variant: key === 'is_blocked' && next ? 'destructive' : 'default',
      successMessage: next ? c.okOn : c.okOff,
      payload: { [key]: next },
    });
  };

  const toggleRow = (
    key: 'is_tracked' | 'is_usdt_authorized' | 'is_blocked',
    title: string,
    description: string
  ) => (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={client[key]}
        disabled={saving}
        onCheckedChange={(v) => askToggle(key, v, title)}
        aria-label={title}
      />
    </label>
  );

  return (
    <>
      {/* Datos: nombre + par, guardado agrupado */}
      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">Nombre</Label>
            <Input
              id="client-name"
              placeholder="Nombre del cliente"
              value={name}
              disabled={saving}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-pair">Par por defecto</Label>
            <Select value={pair} disabled={saving} onValueChange={(v) => setPair(v ?? NO_PAIR)}>
              <SelectTrigger id="client-pair" className="h-11 w-full">
                <SelectValue placeholder="Sin par preferido">
                  {(value: string | null) => pairLabel(value ?? NO_PAIR)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PAIR}>Sin par preferido</SelectItem>
                {pairs.map((p) => (
                  <SelectItem key={p.uuid} value={p.uuid}>
                    {p.pair_symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El bot usa este par cuando el cliente cotiza sin especificar uno.
            </p>
          </div>

          {dataDirty ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={resetData} disabled={saving}>
                Descartar
              </Button>
              <Button onClick={askSaveData} disabled={saving}>
                Guardar cambios
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Datos de pago predeterminados: bloque + moneda, guardado agrupado */}
      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-payment-info">Datos de pago predeterminados</Label>
            <Textarea
              id="client-payment-info"
              placeholder={'0134\nV12345678\n04121234567'}
              value={paymentInfo}
              disabled={saving}
              onChange={(e) => setPaymentInfo(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              El bot usa estos datos cuando el cliente cotiza (ej. &quot;pásame 20&quot;) sin
              enviar los suyos. Banco/cédula/teléfono, cuenta, o llave Pix.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-payment-currency">Moneda de la cuenta</Label>
            <Select
              value={paymentCurrency}
              disabled={saving}
              onValueChange={(v) => setPaymentCurrency(v ?? NO_CURRENCY)}
            >
              <SelectTrigger id="client-payment-currency" className="h-11 w-full">
                <SelectValue placeholder="Sin moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CURRENCY}>Sin moneda</SelectItem>
                {DEFAULT_PAYMENT_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Moneda que el cliente recibe. Los datos solo se inyectan al cotizar en esta moneda.
            </p>
          </div>

          {paymentDirty ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={resetPayment} disabled={saving}>
                Descartar
              </Button>
              <Button onClick={askSavePayment} disabled={saving}>
                Guardar datos de pago
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Switches: confirmación individual */}
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:p-6">
          {toggleRow('is_tracked', 'Seguido', 'Aparece en el seguimiento del operador.')}
          {toggleRow('is_usdt_authorized', 'USDT autorizado', 'Puede cotizar pares con USDT a tasa de mercado.')}
          {toggleRow('is_blocked', 'Bloqueado', 'El bot ignora los mensajes de este cliente.')}
        </CardContent>
      </Card>

      {/* Drawer de confirmación (bottom-sheet en mobile) */}
      <Drawer open={pending !== null} onOpenChange={(next) => !next && !saving && setPending(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{pending?.title ?? 'Confirmar cambio'}</DrawerTitle>
            <DrawerDescription>{pending?.description}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose
              render={
                <Button variant="outline" disabled={saving}>
                  Cancelar
                </Button>
              }
            />
            <Button
              variant={pending?.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={confirmPending}
              disabled={saving}
            >
              {saving ? 'Guardando...' : pending?.confirmLabel ?? 'Confirmar'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
