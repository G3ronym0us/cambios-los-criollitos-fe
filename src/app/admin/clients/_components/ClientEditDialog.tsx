'use client';

import { useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ClientData, ClientUpdate } from '@/types/client';

interface ClientEditDialogProps {
  client: ClientData | null;
  submitting: boolean;
  onSubmit: (data: ClientUpdate) => void;
  onCancel: () => void;
}

type EditFormValues = {
  display_name: string;
  is_tracked: boolean;
  is_blocked: boolean;
  is_usdt_authorized: boolean;
};

function buildDefaults(client: ClientData | null): EditFormValues {
  return {
    display_name: client?.display_name ?? '',
    is_tracked: client?.is_tracked ?? false,
    is_blocked: client?.is_blocked ?? false,
    is_usdt_authorized: client?.is_usdt_authorized ?? false,
  };
}

export function ClientEditDialog({ client, submitting, onSubmit, onCancel }: ClientEditDialogProps) {
  const open = !!client;
  const { register, handleSubmit, setValue, watch, reset } = useForm<EditFormValues>({
    defaultValues: buildDefaults(client),
  });

  useEffect(() => {
    reset(buildDefaults(client));
  }, [client, reset]);

  if (!client) return null;

  const isTracked = watch('is_tracked');
  const isBlocked = watch('is_blocked');
  const isUsdt = watch('is_usdt_authorized');

  const submit: SubmitHandler<EditFormValues> = (data) => {
    const clean: ClientUpdate = {};
    const name = data.display_name.trim();
    if (name !== (client.display_name ?? '')) clean.display_name = name || null;
    if (data.is_tracked !== client.is_tracked) clean.is_tracked = data.is_tracked;
    if (data.is_blocked !== client.is_blocked) clean.is_blocked = data.is_blocked;
    if (data.is_usdt_authorized !== client.is_usdt_authorized) {
      clean.is_usdt_authorized = data.is_usdt_authorized;
    }
    onSubmit(clean);
  };

  const toggleRow = (
    key: keyof EditFormValues,
    checked: boolean,
    title: string,
    description: string
  ) => (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={(v) => setValue(key, v)} aria-label={title} />
    </label>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>
            {client.display_name || 'Sin nombre'} — {client.phone.replace(/@(c|g)\.us$/, '')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">Nombre</Label>
            <Input
              id="client-name"
              placeholder="Nombre del cliente"
              {...register('display_name')}
            />
          </div>

          {toggleRow('is_tracked', isTracked, 'Seguido', 'Aparece en el seguimiento del operador.')}
          {toggleRow('is_usdt_authorized', isUsdt, 'USDT autorizado', 'Puede cotizar pares con USDT a tasa de mercado.')}
          {toggleRow('is_blocked', isBlocked, 'Bloqueado', 'El bot ignora los mensajes de este cliente.')}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
