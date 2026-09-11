'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { PairPicker, type PairRate, type PairUsage } from '@/components/shared/PairPicker';
import { ratesService } from '@/services/ratesService';
import {
  applyRounding,
  effectiveRate as toEffectiveRate,
  pairRoundingFrom,
} from '@/utils/rounding';
import type { CurrencyPairData } from '@/types/admin';
import type { ExchangeRateResponse } from '@/types/currency';
import type { ClientData, ClientUpdate } from '@/types/client';
import type { OperationData } from '@/types/operation';
import { ClientAccountsCard } from './ClientAccountsCard';

/**
 * La tasa que se muestra junto a cada par: la misma cuenta que hace `CreateOperationForm` al
 * cotizar. Si el par redondea la tasa (modo RATE) se muestra ya redondeada —USD-VES a 915, no
 * a los 919,005 crudos del scraper—; el resto de modos usan la del par tal cual. Se duplica en
 * vez de importarse porque cada pantalla la aplica sobre datos propios (aquí no hay tasa "de
 * la operación", sólo la vigente de cada par).
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
  /** Operaciones del cliente, ya cargadas por la página: de aquí sale con cuántas de ellas
   *  usó cada par, para que el selector los ordene sin pedir nada nuevo. */
  operations: OperationData[];
  saving: boolean;
  onSave: (data: ClientUpdate, successMessage?: string) => Promise<boolean>;
}

export function ClientSettingsTab({ client, pairs, operations, saving, onSave }: ClientSettingsTabProps) {
  // Datos (nombre + par) → edición agrupada con un solo "Guardar cambios". '' es "sin par
  // preferido" — mismo centinela que usa el propio PairPicker para "nada elegido".
  const [name, setName] = useState(client.display_name ?? '');
  const [pair, setPair] = useState(client.preferred_pair_uuid ?? '');
  const [pending, setPending] = useState<PendingChange | null>(null);

  // Re-sincroniza el formulario de datos cuando el cliente cambia (tras guardar).
  useEffect(() => {
    setName(client.display_name ?? '');
    setPair(client.preferred_pair_uuid ?? '');
  }, [client.display_name, client.preferred_pair_uuid]);

  const savedPair = client.preferred_pair_uuid ?? '';
  const nameDirty = name.trim() !== (client.display_name ?? '');
  const pairDirty = pair !== savedPair;
  const dataDirty = nameDirty || pairDirty;

  const pairLabel = (value: string) => {
    if (!value) return 'Sin par preferido';
    return pairs.find((p) => p.uuid === value)?.pair_symbol ?? client.preferred_pair_symbol ?? value;
  };

  const resetData = () => {
    setName(client.display_name ?? '');
    setPair(savedPair);
  };

  // Cuántas operaciones lleva este cliente en cada par: se calcula de las que la página ya
  // tiene cargadas (hasta 200), sin pedir nada nuevo al backend.
  const usage = useMemo(() => {
    const counts = new Map<string, PairUsage>();
    for (const op of operations) {
      if (!op.currency_pair_uuid) continue;
      counts.set(op.currency_pair_uuid, { count: (counts.get(op.currency_pair_uuid)?.count ?? 0) + 1 });
    }
    return counts;
  }, [operations]);

  // La tasa vigente de cada par, para que el selector la muestre sin obligar a otra pantalla.
  // Aparte del resto de la carga: si tarda o falla, el selector simplemente no la muestra.
  const [pairRates, setPairRates] = useState<Map<string, PairRate>>(new Map());
  useEffect(() => {
    let active = true;
    ratesService.getAllActiveRates().then((res) => {
      if (!active || !res.success || !res.data) return;
      setPairRates(
        new Map(
          res.data.map((r) => [
            r.currency_pair_uuid,
            { rate: quotedRateOf(r), updatedAt: r.updated_at ?? r.created_at ?? null },
          ]),
        ),
      );
    });
    return () => {
      active = false;
    };
  }, []);

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
      payload.preferred_pair_uuid = pair || null;
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

  // Switches → confirmación individual (uno por uno).
  const askToggle = (
    key: 'is_tracked' | 'is_usdt_authorized' | 'is_rate_setter' | 'is_blocked',
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
      is_rate_setter: {
        on: 'Cuando mande un número suelto que se parezca a la tasa del par, el bot lo tomará como la tasa de su próximo cambio en vez de como un monto.',
        off: 'Un número suelto volverá a leerse como un monto.',
        okOn: 'Puede fijar tasa',
        okOff: 'Ya no fija tasa',
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
    key: 'is_tracked' | 'is_usdt_authorized' | 'is_rate_setter' | 'is_blocked',
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
            {/*
              Sin `preferredUuid`: aquí no hay un par de referencia distinto del que se está
              editando — sería el propio campo marcándose con su propia estrella y anunciando
              "por defecto de X" mientras X es justo lo que el operador está por cambiar. Sin
              ese prop, el `PairPicker` se queda con dos secciones (favoritos del cliente + el
              resto) y ninguna estrella; ver su docstring para el porqué completo.
              `clearable`: "sin par preferido" es un estado tan válido como cualquier par, y
              tiene que poder elegirse desde la lista — no sólo heredarse porque no se tocó.
            */}
            <PairPicker
              id="client-pair"
              pairs={pairs}
              value={pair}
              onChange={setPair}
              usage={usage}
              rates={pairRates}
              totalOperations={operations.length}
              disabled={saving}
              clearable
            />
            <p className="text-xs text-muted-foreground">
              El bot usa este par cuando el cliente cotiza sin especificar uno.
            </p>
          </div>

          {/* Caben en una fila: los dos son cortos y `h-11` ya da el toque de 44 px sin
              necesitar apilarlos a ancho completo como antes. */}
          {dataDirty ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="h-11" onClick={resetData} disabled={saving}>
                Descartar
              </Button>
              <Button className="h-11" onClick={askSaveData} disabled={saving}>
                Guardar cambios
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Libreta de cuentas de pago (varias, con nombre de beneficiario) */}
      <ClientAccountsCard clientUuid={client.uuid} />

      {/* Switches: confirmación individual */}
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:p-6">
          {toggleRow('is_tracked', 'Seguido', 'Aparece en el seguimiento del operador.')}
          {toggleRow('is_usdt_authorized', 'USDT autorizado', 'Puede cotizar pares con USDT a tasa de mercado.')}
          {toggleRow(
            'is_rate_setter',
            'Fija su tasa',
            'Intermediario: dice él a qué tasa le compramos. Un número suelto cerca de la tasa del par se lee como tasa, no como monto, y vale 30 minutos.',
          )}
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
