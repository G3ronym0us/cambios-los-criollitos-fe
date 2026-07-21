'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/shared/LoadingState';
import { clientService } from '@/services/clientService';
import type { ClientData } from '@/types/client';
import type { PaymentData } from '@/types/payment';
import {
  DEFAULT_PAYMENT_CURRENCIES,
  buildPaymentBlock,
  sameBlock,
  suggestedCurrency,
} from '@/utils/paymentBlock';

interface SaveClientDefaultDialogProps {
  payment: PaymentData | null;
  onClose: () => void;
}

export function SaveClientDefaultDialog({ payment, onClose }: SaveClientDefaultDialogProps) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState('');
  const [currency, setCurrency] = useState('');

  const clientUuid = payment?.client_uuid ?? null;

  // Cargar el cliente al abrir; prellenar el bloque candidato con los datos del pago.
  useEffect(() => {
    if (!payment || !clientUuid) {
      setClient(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setInfo(buildPaymentBlock(payment) ?? '');
    setCurrency(suggestedCurrency(payment) || '');
    clientService.getClient(clientUuid).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setClient(res.data);
        // Si el cliente aún no tiene moneda por defecto, conservar la sugerida del pago.
        if (res.data.default_payment_currency) setCurrency(res.data.default_payment_currency);
      } else {
        toast.error(res.error || 'No se pudo cargar el cliente');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [payment, clientUuid]);

  const current = client?.default_payment_info ?? null;
  const candidate = buildPaymentBlock(payment ?? ({} as PaymentData));
  // "Si es igual a los actuales no diga nada": el bloque candidato coincide con el guardado
  // (misma moneda incluida). El operador editó nada aún → sin cambio que confirmar.
  const alreadySame =
    !!current &&
    sameBlock(current, candidate) &&
    (client?.default_payment_currency ?? '') === (suggestedCurrency(payment ?? ({} as PaymentData)) || '');

  // Sin moneda el bot nunca inyectaría estos datos (su guard exige que coincida
  // con la que el cliente recibe), así que guardarlos sin ella no sirve de nada.
  const canSave = info.trim().length > 0 && !!currency;

  const dirty =
    info.trim().length > 0 &&
    (!sameBlock(info, current) || (currency || '') !== (client?.default_payment_currency ?? ''));

  const handleSave = async () => {
    if (!clientUuid) return;
    if (!info.trim()) {
      toast.error('Los datos no pueden estar vacíos');
      return;
    }
    if (!currency) {
      toast.error('Elige la moneda de la cuenta');
      return;
    }
    setSaving(true);
    const res = await clientService.updateClient(clientUuid, {
      default_payment_info: info.trim(),
      default_payment_currency: currency,
    });
    setSaving(false);
    if (res.success) {
      toast.success('Datos predeterminados del cliente actualizados');
      onClose();
    } else {
      toast.error(res.error || 'No se pudieron guardar los datos');
    }
  };

  const clientLabel =
    client?.display_name || payment?.client_name || payment?.client_phone?.replace(/@(c|g)\.us$/, '') || 'Cliente';

  return (
    <Dialog open={payment !== null} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Datos de pago del cliente</DialogTitle>
          <DialogDescription>{clientLabel}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState label="Cargando cliente..." />
        ) : alreadySame ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Estos datos ya son los predeterminados del cliente. No hay nada que cambiar.
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
              {current}
              {client?.default_payment_currency ? `\n(${client.default_payment_currency})` : ''}
            </pre>
          </div>
        ) : (
          <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 py-1">
            {current ? (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Datos actuales</Label>
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted p-3 font-mono text-xs text-muted-foreground">
                  {current}
                  {client?.default_payment_currency ? `\n(${client.default_payment_currency})` : ''}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                El cliente aún no tiene datos predeterminados. Se guardarán estos.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="default-info">{current ? 'Datos nuevos' : 'Datos'}</Label>
              <Textarea
                id="default-info"
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                rows={4}
                className="font-mono text-sm"
                placeholder={'0134\nV12345678\n04121234567'}
              />
              <p className="text-xs text-muted-foreground">
                Banco/cédula/teléfono, cuenta, o llave Pix. El bot los normaliza al usarlos.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="default-currency">Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v ?? '')}>
                <SelectTrigger id="default-currency" className="h-11 w-full">
                  <SelectValue placeholder="Moneda de la cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_PAYMENT_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Moneda que el cliente recibe. El bot usa estos datos al cotizar en esta moneda.
              </p>
            </div>
          </div>
        )}

        {!loading && !alreadySame ? (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !dirty || !canSave}>
              {saving ? 'Guardando...' : 'Guardar datos del cliente'}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
