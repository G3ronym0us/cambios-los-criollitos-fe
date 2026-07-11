'use client';

import { useState } from 'react';
import { Link2Off, PiggyBank, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCaracasDateTime, formatNumber } from '@/utils/functions';
import type { PaymentData, PaymentTable } from '@/types/payment';

interface PaymentDetailDrawerProps {
  payment: PaymentData | null;
  table: PaymentTable;
  onClose: () => void;
  // Desvincula el pago de la operación (el caller confirma y recarga). Debe
  // resolver true si se desvinculó (para cerrar el drawer).
  onUnlink: (table: PaymentTable, payment: PaymentData) => Promise<boolean>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 break-words text-right font-medium text-foreground">{value}</div>
    </div>
  );
}

export function PaymentDetailDrawer({ payment, table, onClose, onUnlink }: PaymentDetailDrawerProps) {
  const [unlinking, setUnlinking] = useState(false);
  const incoming = table === 'incoming';
  const p = payment;

  const handleUnlink = async () => {
    if (!p) return;
    setUnlinking(true);
    const done = await onUnlink(table, p);
    setUnlinking(false);
    if (done) onClose();
  };

  return (
    <Drawer open={p != null} onOpenChange={(open) => !open && !unlinking && onClose()}>
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>
            {incoming ? 'Pago entrante' : 'Pago saliente'}
            {p?.amount != null ? ` · ${formatNumber(p.amount)} ${p.currency ?? ''}` : ''}
          </DrawerTitle>
          <DrawerDescription>Detalle del comprobante vinculado a la operación.</DrawerDescription>
        </DrawerHeader>

        {p ? (
          <div className="space-y-4 overflow-y-auto py-1">
            <div className="flex flex-wrap gap-1.5">
              {incoming && p.deposit ? (
                <StatusBadge tone="success" icon={PiggyBank}>Depósito</StatusBadge>
              ) : incoming && p.fund_group_name ? (
                <StatusBadge tone="info" icon={PiggyBank}>Contabilizado</StatusBadge>
              ) : null}
              {!incoming && p.is_personal_expense ? (
                <StatusBadge tone="warning" icon={Tag}>Personal</StatusBadge>
              ) : null}
              {!incoming && p.is_irrelevant ? (
                <StatusBadge tone="neutral" icon={Tag}>Irrelevante</StatusBadge>
              ) : null}
            </div>

            <div className="divide-y divide-border">
              <Row
                label="Monto"
                value={p.amount != null ? `${formatNumber(p.amount)} ${p.currency ?? ''}` : null}
              />
              <Row label="Proveedor" value={p.provider} />
              <Row label="Banco origen" value={p.bank_from} />
              <Row label="Banco destino" value={p.bank_to} />
              <Row label="Cuenta" value={p.account_number} />
              <Row label="Identificación" value={p.identification} />
              <Row label="Teléfono destino" value={p.phone_to} />
              <Row label="Referencia" value={p.reference} />
              <Row label="Fecha" value={p.created_at ? formatCaracasDateTime(p.created_at) : null} />
              <Row
                label="Cliente"
                value={p.client_name || p.client_phone?.replace(/@(c|g)\.us$/, '')}
              />
            </div>

            {p.raw_text ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Texto del comprobante (OCR)
                </p>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 text-xs leading-5 text-foreground">
                  {p.raw_text}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}

        <DrawerFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="min-h-11" onClick={handleUnlink} disabled={unlinking}>
            <Link2Off className="h-4 w-4" />
            {unlinking ? 'Desvinculando…' : 'Desvincular de la operación'}
          </Button>
          <Button variant="outline" className="min-h-11" onClick={onClose} disabled={unlinking}>
            Cerrar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
