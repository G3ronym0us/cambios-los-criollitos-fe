'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Globe, Search, UserRound } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { paymentService } from '@/services/paymentService';
import { formatNumber, isUnassignedClientPhone } from '@/utils/functions';
import type { OperationData } from '@/types/operation';
import type { PaymentData, PaymentTable } from '@/types/payment';

interface LinkPaymentDialogProps {
  operation: OperationData;
  open: boolean;
  onClose: () => void;
  onLinked: () => void;
}

function stripPhone(phone: string | null) {
  return (phone || '').replace(/@(c|g)\.us$/, '');
}

function samePhone(a: string | null, b: string | null) {
  const na = stripPhone(a).replace(/\D/g, '');
  const nb = stripPhone(b).replace(/\D/g, '');
  return na !== '' && na === nb;
}

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LinkPaymentDialog({ operation, open, onClose, onLinked }: LinkPaymentDialogProps) {
  const operationHasGroupClient = isUnassignedClientPhone(operation.client_phone);
  const [table, setTable] = useState<PaymentTable>('outgoing');
  const [search, setSearch] = useState('');
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<'client' | 'global'>('client');
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset al abrir.
  useEffect(() => {
    if (!open) return;
    setTable('outgoing');
    setSearch('');
    setScope(operationHasGroupClient ? 'global' : 'client');
    setSelected(null);
    setSubmitting(false);
  }, [open, operationHasGroupClient]);

  // Búsqueda server-side (con debounce) sobre los pagos de la tabla activa.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      paymentService
        .getPayments(table, {
          limit: 100,
          search: search.trim() || undefined,
          unlinkedOnly: true,
        })
        .then((res) => {
          if (!active) return;
          if (res.success && res.data) setPayments(res.data.items);
          else toast.error(res.error || 'No se pudieron cargar los pagos');
          setLoading(false);
        });
    }, search ? 300 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, table, search]);

  // El backend devuelve exclusivamente pagos libres. Se conserva el filtro local
  // como defensa ante una respuesta antigua durante un despliegue escalonado.
  const candidates = useMemo(() => {
    let list = payments.filter((p) => !p.operation_uuid);
    if (table === 'outgoing') {
      list = list.filter((p) => !p.is_personal_expense && !p.is_irrelevant);
    }
    if (scope === 'client') {
      list = list.filter(
        (p) =>
          (p.client_uuid && p.client_uuid === operation.client_uuid) ||
          samePhone(p.client_phone, operation.client_phone),
      );
    }
    return list.slice(0, 60);
  }, [payments, table, scope, operation.client_uuid, operation.client_phone]);

  const clientLabel =
    operation.client_display_name || stripPhone(operation.client_phone) || 'el cliente';

  const doLink = async () => {
    if (selected == null) return;
    setSubmitting(true);
    const res = await paymentService.linkOperation(table, selected, operation.uuid);
    setSubmitting(false);
    if (res.success) {
      toast.success(
        operationHasGroupClient && table === 'outgoing'
          ? 'Pago vinculado y cliente de la operación detectado'
          : `Pago ${table === 'outgoing' ? 'saliente' : 'entrante'} vinculado a la operación`,
      );
      onLinked();
      onClose();
    } else {
      toast.error(res.error || 'No se pudo vincular el pago');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular pago a la operación</DialogTitle>
          <DialogDescription>
            {operationHasGroupClient
              ? 'La operación proviene de un grupo. Al vincular el pago saliente se asignará su cliente real.'
              : 'Elige un comprobante sin operación para asociarlo a esta cotización.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={table} onValueChange={(v) => { setTable(v as PaymentTable); setSelected(null); }}>
          <TabsList className="w-full">
            <TabsTrigger value="outgoing" className="flex-1">
              <ArrowUpRight className="h-4 w-4" />
              Salientes
            </TabsTrigger>
            <TabsTrigger value="incoming" className="flex-1">
              <ArrowDownLeft className="h-4 w-4" />
              Entrantes
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cliente, banco, referencia o proveedor"
            className="h-10 pl-9"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {scope === 'client' ? (
              <UserRound className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Globe className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {scope === 'client' ? `Pagos de ${clientLabel}` : 'Todos los pagos sin operación'}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setScope((s) => (s === 'client' ? 'global' : 'client'))}
          >
            {scope === 'client' ? (
              <>
                <Globe className="h-4 w-4" />
                Ver todos
              </>
            ) : (
              <>
                <UserRound className="h-4 w-4" />
                Solo del cliente
              </>
            )}
          </Button>
        </div>

        <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 py-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando pagos…</p>
          ) : candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {scope === 'client'
                ? 'Sin pagos libres de este cliente. Prueba "Ver todos" o busca por referencia.'
                : 'Sin pagos sin operación que coincidan.'}
            </p>
          ) : (
            candidates.map((p) => {
              const isSel = selected === p.id;
              const who = p.client_name || stripPhone(p.client_phone) || 'Sin cliente';
              const detail = [p.provider, p.bank_to || p.bank_from].filter(Boolean).join(' · ');
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    isSel ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {p.amount != null ? formatNumber(p.amount) : '—'} {p.currency ?? ''}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">#{p.id} · {formatDate(p.created_at)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{who}{detail ? ` · ${detail}` : ''}</span>
                    {p.reference ? <span className="shrink-0">Ref. {p.reference}</span> : null}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={doLink} disabled={submitting || selected == null}>
            {submitting ? 'Guardando…' : 'Vincular pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
