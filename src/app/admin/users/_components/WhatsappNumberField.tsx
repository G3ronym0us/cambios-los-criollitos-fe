'use client';

import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClientData } from '@/types/client';

const onlyDigits = (s: string) => s.replace(/\D/g, '');

/** Usuario mínimo para detectar de quién es un número ya tomado. */
export interface WhatsappOwnerLite {
  uuid: string;
  full_name?: string;
  username: string;
  phone_number?: string | null;
}

interface WhatsappNumberFieldProps {
  value: string;
  onChange: (digits: string) => void;
  /** Contactos de WhatsApp conocidos por el bot (para el modo Lista). */
  contacts: ClientData[];
  /** Todos los usuarios, para excluir números ya tomados y avisar de quién es. */
  users: WhatsappOwnerLite[];
  /** Usuario que se edita (se excluye de la detección de conflicto). */
  currentUserUuid?: string;
}

export function WhatsappNumberField({
  value,
  onChange,
  contacts,
  users,
  currentUserUuid,
}: WhatsappNumberFieldProps) {
  const digits = onlyDigits(value);

  // Números que ya son de OTRO usuario -> nombre del dueño.
  const ownerByDigits = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (currentUserUuid && u.uuid === currentUserUuid) continue;
      const d = onlyDigits(u.phone_number ?? '');
      if (d) map.set(d, u.full_name || u.username);
    }
    return map;
  }, [users, currentUserUuid]);

  const conflictOwner = digits ? ownerByDigits.get(digits) ?? null : null;

  const selectedContact = useMemo(
    () => (digits ? contacts.find((c) => onlyDigits(c.phone) === digits) : undefined),
    [contacts, digits],
  );

  // Modo inicial: manual si ya hay un número que no está entre los contactos.
  const [mode, setMode] = useState<'list' | 'manual'>(
    digits && !selectedContact ? 'manual' : 'list',
  );

  // Contactos ofrecibles: excluir los que ya son de otro usuario (pero conservar el
  // que este usuario ya tiene, aunque coincida con un contacto).
  const availableContacts = useMemo(
    () =>
      contacts.filter((c) => {
        const d = onlyDigits(c.phone);
        return d === digits || !ownerByDigits.has(d);
      }),
    [contacts, ownerByDigits, digits],
  );

  return (
    <div className="space-y-1.5">
      <Label>Número de WhatsApp</Label>

      <Tabs value={mode} onValueChange={(v) => setMode(v as 'list' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Desde la lista</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === 'list' ? (
        <Select
          value={selectedContact?.uuid ?? ''}
          onValueChange={(uuid) => {
            const c = contacts.find((x) => x.uuid === uuid);
            if (c) onChange(onlyDigits(c.phone));
          }}
        >
          <SelectTrigger id="wa-number-contact" className="h-10 w-full">
            <SelectValue placeholder="Elegir un contacto de WhatsApp...">
              {selectedContact
                ? selectedContact.display_name || selectedContact.phone
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableContacts.length > 0 ? (
              availableContacts.map((c) => (
                <SelectItem key={c.uuid} value={c.uuid}>
                  {c.display_name ? `${c.display_name} — ${c.phone}` : c.phone}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No hay contactos disponibles. Usa &quot;Manual&quot;.
              </div>
            )}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id="wa-number-manual"
          value={value}
          onChange={(e) => onChange(onlyDigits(e.target.value))}
          placeholder="Ej: 584240000001"
          inputMode="numeric"
          className="h-10"
        />
      )}

      {conflictOwner ? (
        <p className="text-xs text-destructive">
          Ese número ya es de <span className="font-medium">{conflictOwner}</span>.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          El bot detecta los cambios que reporta este usuario como socio (escenario vía socio).
        </p>
      )}
    </div>
  );
}
