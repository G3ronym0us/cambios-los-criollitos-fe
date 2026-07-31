'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BadgeAlert, Landmark, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useConfirm } from '@/hooks/useConfirm';
import { clientService } from '@/services/clientService';
import { DEFAULT_PAYMENT_CURRENCIES } from '@/utils/paymentBlock';
import type { ClientAccount } from '@/types/client';

// Centinela para "sin moneda elegida" (el Select no admite value="").
const NO_CURRENCY = '__none__';

function sourceLabel(source: ClientAccount['source']) {
  if (source === 'MESSAGE') return 'Del cliente';
  if (source === 'RECEIPT') return 'Del comprobante';
  return 'Manual';
}

interface CurrencySelectProps {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

function CurrencySelect({ id, value, disabled, onChange }: CurrencySelectProps) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(v) => onChange(v ?? NO_CURRENCY)}>
      <SelectTrigger id={id} className="h-11 w-full">
        <SelectValue placeholder="Elige la moneda">
          {(v: string | null) => (!v || v === NO_CURRENCY ? 'Elige la moneda' : v)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {DEFAULT_PAYMENT_CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ClientAccountsCardProps {
  clientUuid: string;
}

/**
 * Libreta de cuentas del cliente: varias cuentas de pago con nombre, para que "465000 a
 * yelitza" cotice con los datos de Yelitza ya inyectados. Reemplaza a la vieja card de
 * "datos de pago predeterminados" (una sola cuenta por cliente).
 */
export function ClientAccountsCard({ clientUuid }: ClientAccountsCardProps) {
  const confirm = useConfirm();

  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUuid, setBusyUuid] = useState<string | null>(null);

  // Formulario "Agregar cuenta".
  const [newAlias, setNewAlias] = useState('');
  const [newInfo, setNewInfo] = useState('');
  const [newCurrency, setNewCurrency] = useState(NO_CURRENCY);
  const [adding, setAdding] = useState(false);

  // Drawer de edición (alias + bloque + moneda de una cuenta existente).
  const [editing, setEditing] = useState<ClientAccount | null>(null);
  const [editAlias, setEditAlias] = useState('');
  const [editInfo, setEditInfo] = useState('');
  const [editCurrency, setEditCurrency] = useState(NO_CURRENCY);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await clientService.getAccounts(clientUuid);
    setAccounts(result.success && result.data ? result.data.items : []);
    setLoading(false);
  }, [clientUuid]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (account: ClientAccount) => {
    setEditing(account);
    setEditAlias(account.alias ?? '');
    setEditInfo(account.payment_info);
    setEditCurrency(account.currency);
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditing(null);
  };

  const submitAdd = async () => {
    const info = newInfo.trim();
    if (!info) {
      toast.error('Ingresa los datos de la cuenta');
      return;
    }
    // La moneda es obligatoria: sin ella el bot nunca inyecta la cuenta y el dato queda inerte.
    if (newCurrency === NO_CURRENCY) {
      toast.error('Elige la moneda de la cuenta');
      return;
    }
    setAdding(true);
    const result = await clientService.createAccount(clientUuid, {
      alias: newAlias.trim() || null,
      payment_info: info,
      currency: newCurrency,
    });
    setAdding(false);
    if (result.success) {
      toast.success('Cuenta guardada');
      setNewAlias('');
      setNewInfo('');
      setNewCurrency(NO_CURRENCY);
      load();
    } else {
      toast.error(result.error || 'No se pudo guardar la cuenta');
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    const info = editInfo.trim();
    if (!info) {
      toast.error('Ingresa los datos de la cuenta');
      return;
    }
    if (editCurrency === NO_CURRENCY) {
      toast.error('Elige la moneda de la cuenta');
      return;
    }
    setSavingEdit(true);
    const result = await clientService.updateAccount(editing.uuid, {
      alias: editAlias.trim() || null,
      payment_info: info,
      currency: editCurrency,
    });
    setSavingEdit(false);
    if (result.success) {
      toast.success('Cuenta actualizada');
      setEditing(null);
      load();
    } else {
      toast.error(result.error || 'No se pudo actualizar la cuenta');
    }
  };

  const confirmAccount = async (account: ClientAccount) => {
    setBusyUuid(account.uuid);
    const result = await clientService.updateAccount(account.uuid, { is_confirmed: true });
    setBusyUuid(null);
    if (result.success) {
      toast.success('Cuenta confirmada');
      load();
    } else {
      toast.error(result.error || 'No se pudo confirmar la cuenta');
    }
  };

  const makeDefault = async (account: ClientAccount) => {
    setBusyUuid(account.uuid);
    const result = await clientService.updateAccount(account.uuid, { is_default: true });
    setBusyUuid(null);
    if (result.success) {
      toast.success('Cuenta marcada como predeterminada');
      load();
    } else {
      toast.error(result.error || 'No se pudo marcar como predeterminada');
    }
  };

  const removeAccount = async (account: ClientAccount) => {
    const ok = await confirm({
      title: 'Borrar cuenta',
      description: `Se va a borrar ${
        account.alias ? `la cuenta de "${account.alias}"` : 'la cuenta predeterminada'
      }. Esta acción no se puede deshacer.`,
      confirmText: 'Borrar',
      variant: 'destructive',
    });
    if (!ok) return;
    setBusyUuid(account.uuid);
    const result = await clientService.deleteAccount(account.uuid);
    setBusyUuid(null);
    if (result.success) {
      toast.success('Cuenta borrada');
      load();
    } else {
      toast.error(result.error || 'No se pudo borrar la cuenta');
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border bg-muted/40">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Landmark className="h-5 w-5" />
          Cuentas guardadas
        </CardTitle>
        <CardDescription>
          El bot inyecta estos datos cuando el cliente nombra a alguien (&quot;a yelitza&quot;) o
          cotiza sin especificar cuenta (usa la predeterminada).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-6">
        {loading ? (
          <LoadingState label="Cargando cuentas..." />
        ) : accounts.length === 0 ? (
          <EmptyState icon={Landmark} title="Este cliente no tiene cuentas guardadas." />
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const busy = busyUuid === account.uuid;
              return (
                <div
                  key={account.uuid}
                  className="space-y-3 rounded-lg border border-border bg-muted/40 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {account.alias ?? 'Cuenta predeterminada'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {account.is_default ? (
                        <StatusBadge tone="primary" icon={Star}>
                          Predeterminada
                        </StatusBadge>
                      ) : null}
                      {!account.is_confirmed ? (
                        <StatusBadge tone="destructive" icon={BadgeAlert}>
                          Sin confirmar
                        </StatusBadge>
                      ) : null}
                      <StatusBadge tone="neutral">{sourceLabel(account.source)}</StatusBadge>
                      <StatusBadge tone="info">{account.currency}</StatusBadge>
                    </div>
                  </div>

                  <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground">
                    {account.payment_info}
                  </pre>

                  <div className="flex flex-wrap gap-2">
                    {!account.is_confirmed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => confirmAccount(account)}
                      >
                        Confirmar
                      </Button>
                    ) : null}
                    {!account.is_default ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => makeDefault(account)}
                      >
                        Predeterminada
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => openEdit(account)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => removeAccount(account)}
                    >
                      Borrar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Agregar cuenta */}
        <div className="space-y-4 rounded-lg border border-dashed border-border p-3 sm:p-4">
          <p className="text-sm font-medium text-foreground">Agregar cuenta</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-account-alias">Nombre del beneficiario (opcional)</Label>
            <Input
              id="new-account-alias"
              placeholder="Yelitza Bolívar"
              value={newAlias}
              disabled={adding}
              onChange={(e) => setNewAlias(e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Sin nombre, la cuenta queda disponible pero no se resuelve por alias.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-account-info">Datos de la cuenta</Label>
            <Textarea
              id="new-account-info"
              placeholder={'0134\nV12345678\n04121234567'}
              value={newInfo}
              disabled={adding}
              onChange={(e) => setNewInfo(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-account-currency">Moneda</Label>
            <CurrencySelect
              id="new-account-currency"
              value={newCurrency}
              disabled={adding}
              onChange={setNewCurrency}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={submitAdd} disabled={adding}>
              <Plus className="h-4 w-4" />
              {adding ? 'Guardando...' : 'Agregar cuenta'}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Drawer de edición (bottom-sheet en mobile) */}
      <Drawer open={editing !== null} onOpenChange={(next) => !next && closeEdit()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Editar cuenta</DrawerTitle>
            <DrawerDescription>
              {editing?.alias ?? 'Cuenta predeterminada'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-account-alias">Nombre del beneficiario (opcional)</Label>
              <Input
                id="edit-account-alias"
                value={editAlias}
                disabled={savingEdit}
                onChange={(e) => setEditAlias(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-account-info">Datos de la cuenta</Label>
              <Textarea
                id="edit-account-info"
                value={editInfo}
                disabled={savingEdit}
                onChange={(e) => setEditInfo(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-account-currency">Moneda</Label>
              <CurrencySelect
                id="edit-account-currency"
                value={editCurrency}
                disabled={savingEdit}
                onChange={setEditCurrency}
              />
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose render={<Button variant="outline" disabled={savingEdit}>Cancelar</Button>} />
            <Button onClick={submitEdit} disabled={savingEdit}>
              {savingEdit ? 'Guardando...' : 'Guardar'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Card>
  );
}
