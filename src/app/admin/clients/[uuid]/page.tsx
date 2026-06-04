'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  Coins,
  Eye,
  Pencil,
  Receipt,
  Users,
  UserX,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { OperationItem } from '../../operations/_components/OperationItem';
import { ClientEditDialog } from '../_components/ClientEditDialog';
import { useClientProfile } from './_hooks/useClientProfile';

// Centinela para "sin par preferido" (Select no admite value="").
const NO_PAIR = '__none__';

function isGroup(phone: string) {
  return phone.includes('@g.us');
}

function formatPhone(phone: string) {
  if (isGroup(phone)) return 'Grupo de WhatsApp';
  return phone.replace(/@c\.us$/, '');
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function ClientProfilePage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { state, actions } = useClientProfile(uuid);
  const {
    client,
    loading,
    notFound,
    editing,
    submitting,
    operations,
    operationsLoading,
    pairs,
    savingPair,
  } = state;

  if (loading) {
    return <LoadingState label="Cargando cliente..." />;
  }

  if (notFound || !client) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/clients"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-fit')}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>
        <EmptyState
          icon={UserX}
          title="Cliente no encontrado"
          description="El cliente que buscas no existe o fue eliminado."
        />
      </div>
    );
  }

  const group = isGroup(client.phone);
  const hasName = !!client.display_name;
  const title = client.display_name || formatPhone(client.phone);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clients"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-fit')}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </Link>

      <PageHeader
        title={title}
        description={formatPhone(client.phone)}
        actions={
          <Button onClick={actions.openEdit}>
            <Pencil className="h-4 w-4" />
            {hasName ? 'Editar cliente' : 'Establecer nombre'}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {group ? <StatusBadge tone="neutral" icon={Users}>Grupo</StatusBadge> : null}
        {client.is_blocked ? <StatusBadge tone="destructive" icon={Ban}>Bloqueado</StatusBadge> : null}
        {client.is_tracked ? <StatusBadge tone="info" icon={Eye}>Seguido</StatusBadge> : null}
        {client.is_usdt_authorized ? <StatusBadge tone="success" icon={Coins}>USDT</StatusBadge> : null}
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
          <Field label="Nombre" value={client.display_name || 'Sin nombre (usando el número)'} />
          <Field label="Teléfono" value={formatPhone(client.phone)} />
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Par por defecto
            </span>
            <Select
              value={client.preferred_pair_uuid ?? NO_PAIR}
              disabled={savingPair}
              onValueChange={(v) =>
                actions.updatePreferredPair(!v || v === NO_PAIR ? null : v)
              }
            >
              <SelectTrigger className="h-11 w-full sm:max-w-xs">
                <SelectValue placeholder="Sin par preferido">
                  {(value: string | null) => {
                    if (!value || value === NO_PAIR) return 'Sin par preferido';
                    const match = pairs.find((p) => p.uuid === value);
                    return match?.pair_symbol ?? client.preferred_pair_symbol ?? value;
                  }}
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
          </div>
          <Field label="Visto por última vez" value={formatDate(client.last_seen_at)} />
          <Field label="Creado" value={formatDate(client.created_at)} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Transacciones</h2>
          {!operationsLoading && operations.length > 0 ? (
            <span className="text-sm text-muted-foreground">
              {operations.length} {operations.length === 1 ? 'operación' : 'operaciones'}
            </span>
          ) : null}
        </div>

        {operationsLoading ? (
          <LoadingState label="Cargando transacciones..." />
        ) : operations.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sin transacciones"
            description="Este cliente todavía no tiene operaciones registradas."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {operations.map((op) => (
              <OperationItem key={op.uuid} operation={op} />
            ))}
          </div>
        )}
      </section>

      <ClientEditDialog
        client={editing ? client : null}
        submitting={submitting}
        onSubmit={actions.handleUpdate}
        onCancel={actions.closeEdit}
      />
    </div>
  );
}
