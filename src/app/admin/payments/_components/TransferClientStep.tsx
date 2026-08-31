'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Info, Search, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SidePanelBody, SidePanelFooter } from '@/components/shared/SidePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { clientService } from '@/services/clientService';
import { paymentService } from '@/services/paymentService';
import type { ClientData } from '@/types/client';
import type { PaymentData, PaymentTable, PaymentTransferReason } from '@/types/payment';
import { describePayment } from './paymentRowData';
import {
  TRANSFER_REASONS,
  sharesSurname,
  transferBlockingField,
  transferUnlinksOperation,
} from './paymentTransfer';

interface TransferClientStepProps {
  payment: PaymentData;
  table: PaymentTable;
  /** El pago ya se mudó: la bandeja tiene que releerse y el cajón cerrarse. */
  onDone: () => void;
  onCancel: () => void;
}

const stripJid = (phone: string | null | undefined) => (phone || '').replace(/@(c|g)\.us$/, '');

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function clientLabel(c: ClientData) {
  return c.display_name || stripJid(c.phone) || 'Sin identificar';
}

/** Tarjeta de un lado del traspaso. La de destino va resaltada: es la que cambia. */
function SideCard({
  eyebrow,
  name,
  detail,
  highlight,
}: {
  eyebrow: string;
  name: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'min-w-0 flex-1 rounded-lg border bg-card px-3 py-2',
        highlight ? 'border-primary ring-3 ring-primary/10' : 'border-border',
      )}
    >
      <div
        className={cn(
          'text-[10.5px] font-bold uppercase tracking-wider',
          highlight ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {eyebrow}
      </div>
      <div className="mt-0.5 truncate text-[12.5px] font-semibold text-foreground">{name}</div>
      <div className="truncate text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

/**
 * Mudar un comprobante de cliente, dentro del mismo cajón.
 *
 * No es un campo editable en la tarjeta del cliente a propósito: cambiarlo ahí se sentiría
 * como corregir un dato, y esto mueve plata de un perfil a otro. Vive donde viven las acciones
 * con consecuencias, y todo lo que la transferencia va a provocar —de quién a quién, de qué
 * operación se desengancha— está a la vista antes de confirmar.
 */
export function TransferClientStep({ payment, table, onDone, onCancel }: TransferClientStepProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ClientData | null>(null);
  const [reason, setReason] = useState<PaymentTransferReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Marca la búsqueda vigente: una respuesta lenta de un término ya borrado no debe pisar
  // los resultados del término actual.
  const searchToken = useRef(0);

  const d = describePayment(payment);
  const originName = d.client;
  const originPhone = stripJid(payment.client_phone) || 'Sin teléfono';

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const token = ++searchToken.current;
    setLoading(true);
    const timer = setTimeout(() => {
      clientService.getClients({ search: term, limit: 8 }).then((res) => {
        if (token !== searchToken.current) return;
        setLoading(false);
        if (res.success && res.data) setResults(res.data.items || []);
        else setResults([]);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // El cliente actual no es un destino: transferirse a sí mismo no es nada.
  const candidates = useMemo(
    () => results.filter((c) => c.uuid !== payment.client_uuid),
    [results, payment.client_uuid],
  );

  const missing = transferBlockingField(selected?.uuid ?? null, reason);
  const unlinks = transferUnlinksOperation(payment);

  const submit = async () => {
    if (!selected || !reason) return;
    setSubmitting(true);
    const res = await paymentService.transferClient(table, payment.id, {
      client_uuid: selected.uuid,
      reason,
      note,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success(`Pago transferido a ${clientLabel(selected)}`);
      onDone();
    } else {
      toast.error(res.error || 'No se pudo transferir el pago');
    }
  };

  return (
    <>
      <SidePanelBody>
        {/* De quién a quién, antes que nada: es la frase entera de la pantalla. */}
        <div className="flex items-center gap-2.5">
          <SideCard eyebrow="Hoy es de" name={originName} detail={originPhone} />
          <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-primary" />
          {selected ? (
            <SideCard
              eyebrow="Pasa a"
              name={clientLabel(selected)}
              detail={stripJid(selected.phone) || 'Sin teléfono'}
              highlight
            />
          ) : (
            <div className="min-w-0 flex-1 rounded-lg border border-dashed border-border px-3 py-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Pasa a
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                Elige el cliente destino
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transfer-search">Buscar cliente destino</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="transfer-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre o teléfono"
              className="h-10 pl-8"
              autoFocus
            />
          </div>

          {search.trim().length >= 2 ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {loading ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">Buscando…</p>
              ) : candidates.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  Ningún otro cliente coincide con «{search.trim()}».
                </p>
              ) : (
                candidates.map((c, i) => {
                  const isSelected = selected?.uuid === c.uuid;
                  // El caso más común es un pago entre familiares, y el apellido compartido es
                  // lo que distingue al destino correcto de un homónimo cualquiera.
                  const family = sharesSurname(payment.client_name, c.display_name);
                  return (
                    <button
                      key={c.uuid}
                      type="button"
                      onClick={() => setSelected(c)}
                      aria-pressed={isSelected}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                        i > 0 && 'border-t border-border/60',
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                          isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {initials(clientLabel(c)) || '?'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-foreground">
                          {clientLabel(c)}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {stripJid(c.phone) || 'Sin teléfono'}
                        </span>
                      </span>
                      {family ? (
                        <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Mismo apellido
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>
            Motivo <span className="font-normal text-muted-foreground">· queda en el rastro</span>
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {TRANSFER_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                aria-pressed={reason === r.value}
                className={cn(
                  'inline-flex h-8 items-center rounded-full border px-3 text-[11.5px] transition-colors',
                  reason === r.value
                    ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Input
            aria-label="Nota del motivo"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota opcional: «el esposo mandó el Zelle, la operación es de ella»"
            className="h-10 text-[12.5px]"
          />
        </div>

        {/* La consecuencia, antes de confirmar y no en un diálogo después: no hay nada que
            decidir sobre la operación vieja, solo algo que saber. */}
        {unlinks ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-amber-700 dark:text-amber-400">
            <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                Se desvincula de{' '}
                <Link
                  href={`/admin/operations/${payment.operation_uuid}`}
                  className="underline underline-offset-2"
                >
                  su operación
                </Link>
              </p>
              <p className="mt-0.5 text-pretty text-[11px]">
                Esa operación de {originName} queda sin pago y vuelve a esperar fondos — la
                transferencia nunca la muda de cliente por su cuenta. Si quieres conservarla como
                está, cancela y desvincula tú mismo primero.
              </p>
            </div>
          </div>
        ) : null}
      </SidePanelBody>

      {/* Qué falta para poder confirmar, junto al botón que lo confirma. Un botón gris sin
          explicación obliga a repasar el formulario para adivinar cuál de los dos requisitos
          es el que no está puesto. */}
      {missing !== null ? (
        <p className="shrink-0 border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground sm:px-5">
          {missing === 'destination'
            ? 'Elige a qué cliente pasa el pago.'
            : 'Elige el motivo: es lo que queda escrito en el rastro.'}
        </p>
      ) : null}

      <SidePanelFooter className={cn(missing !== null && 'border-t-0')}>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={submitting || missing !== null}>
          <UserRoundCheck className="h-4 w-4" />
          {submitting
            ? 'Transfiriendo…'
            : selected
              ? `Transferir a ${clientLabel(selected).split(/\s+/)[0]}`
              : 'Transferir'}
        </Button>
      </SidePanelFooter>
    </>
  );
}
