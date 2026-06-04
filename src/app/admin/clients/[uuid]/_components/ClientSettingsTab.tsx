'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

// Centinela para "sin par preferido" (el Select no admite value="").
const NO_PAIR = '__none__';

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
  const [name, setName] = useState(client.display_name ?? '');
  const [pending, setPending] = useState<PendingChange | null>(null);

  // Re-sincroniza el input de nombre cuando el cliente cambia (tras guardar).
  useEffect(() => {
    setName(client.display_name ?? '');
  }, [client.display_name]);

  const nameDirty = name.trim() !== (client.display_name ?? '');

  const pairLabel = (uuid: string | null) => {
    if (!uuid) return 'Sin par preferido';
    return pairs.find((p) => p.uuid === uuid)?.pair_symbol ?? client.preferred_pair_symbol ?? uuid;
  };

  const confirmPending = async () => {
    if (!pending) return;
    const ok = await onSave(pending.payload, pending.successMessage);
    if (ok) setPending(null);
  };

  const askName = () => {
    const value = name.trim();
    setPending({
      title: 'Actualizar nombre',
      description: value
        ? `El cliente pasará a llamarse "${value}".`
        : 'Se quitará el nombre; se mostrará el número.',
      confirmLabel: 'Guardar nombre',
      successMessage: 'Nombre actualizado',
      payload: { display_name: value || null },
    });
  };

  const askPair = (value: string) => {
    const pairUuid = value === NO_PAIR ? null : value;
    if (pairUuid === (client.preferred_pair_uuid ?? null)) return;
    setPending({
      title: 'Cambiar par por defecto',
      description: `El bot cotizará con ${pairLabel(pairUuid)} cuando el cliente no especifique un par.`,
      confirmLabel: 'Cambiar par',
      successMessage: 'Par por defecto actualizado',
      payload: { preferred_pair_uuid: pairUuid },
    });
  };

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
      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">Nombre</Label>
            <div className="flex items-center gap-2">
              <Input
                id="client-name"
                placeholder="Nombre del cliente"
                value={name}
                disabled={saving}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
              {nameDirty ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    className="h-11 w-11"
                    onClick={askName}
                    disabled={saving}
                    aria-label="Guardar nombre"
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setName(client.display_name ?? '')}
                    disabled={saving}
                    aria-label="Descartar cambios del nombre"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Par por defecto */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-pair">Par por defecto</Label>
            <Select
              value={client.preferred_pair_uuid ?? NO_PAIR}
              disabled={saving}
              onValueChange={(v) => askPair(v ?? NO_PAIR)}
            >
              <SelectTrigger id="client-pair" className="h-11 w-full">
                <SelectValue placeholder="Sin par preferido">
                  {(value: string | null) => pairLabel(!value || value === NO_PAIR ? null : value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PAIR}>Sin par preferido</SelectItem>
                {pairs.map((pair) => (
                  <SelectItem key={pair.uuid} value={pair.uuid}>
                    {pair.pair_symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El bot usa este par cuando el cliente cotiza sin especificar uno.
            </p>
          </div>

          {/* Switches */}
          <div className="flex flex-col gap-2">
            {toggleRow('is_tracked', 'Seguido', 'Aparece en el seguimiento del operador.')}
            {toggleRow('is_usdt_authorized', 'USDT autorizado', 'Puede cotizar pares con USDT a tasa de mercado.')}
            {toggleRow('is_blocked', 'Bloqueado', 'El bot ignora los mensajes de este cliente.')}
          </div>
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
