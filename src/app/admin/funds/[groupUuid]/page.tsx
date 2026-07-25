'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, UserPlus, Wallet } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { cn } from '@/lib/utils';
import { BalanceCards } from '../_components/BalanceCards';
import { FundDialogs } from '../_components/FundDialogs';
import { FundsBreadcrumb } from '../_components/FundsBreadcrumb';
import { MemberPositionsList } from '../_components/MemberPositionsList';
import { MembersList } from '../_components/MembersList';
import { MovementsPreview } from '../_components/MovementsPreview';
import { ProfitConfigCard } from '../_components/ProfitConfigCard';
import { PendingDepositsList } from '../_components/PendingDepositsList';
import { useFundGroupDetail } from '../_hooks/useFundGroupDetail';
import { avatarClass, initialOf } from '../_lib/format';

function formatSince(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

export default function FundGroupDetailPage() {
  const params = useParams<{ groupUuid: string }>();
  const groupUuid = params.groupUuid;
  const { resources, mutations, state, actions } = useFundGroupDetail(groupUuid);

  if (state.loadingGroups) {
    return <LoadingState label="Cargando grupo..." fullHeight />;
  }

  if (state.notFound || !state.group) {
    return (
      <div className="space-y-6">
        <FundsBreadcrumb items={[{ label: 'Fondos', href: '/admin/funds' }, { label: 'No encontrado' }]} />
        <EmptyState
          icon={Wallet}
          title="Grupo no encontrado"
          description="El grupo de fondos no existe o fue eliminado."
          actions={
            <Link href="/admin/funds" className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
              <ArrowLeft className="h-4 w-4" />
              Volver a Fondos
            </Link>
          }
        />
      </div>
    );
  }

  const { group } = state;
  const membersCount = state.members.length;
  const since = formatSince(group.created_at);

  return (
    <div className="space-y-6">
      <FundsBreadcrumb
        items={[{ label: 'Fondos', href: '/admin/funds' }, { label: group.name }]}
      />

      <header className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold',
              avatarClass(group.uuid),
            )}
          >
            {initialOf(group.name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {group.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {membersCount} {membersCount === 1 ? 'miembro' : 'miembros'}
              {since ? ` · activo desde ${since}` : ''}
            </p>
          </div>
        </div>

        {state.isModeratorOrAbove ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="lg" onClick={() => mutations.actions.openAddMember()}>
              <UserPlus className="h-4 w-4" />
              Agregar miembro
            </Button>
            <Button size="lg" onClick={() => mutations.actions.openRegisterMovement()}>
              <Plus className="h-4 w-4" />
              Registrar movimiento
            </Button>
          </div>
        ) : null}
      </header>

      <BalanceCards balance={state.balance} loading={state.loadingBalance} />

      {state.isModeratorOrAbove ? (
        <PendingDepositsList
          groupUuid={groupUuid}
          availableUsers={resources.availableUsers}
          onConfirmed={actions.reload}
        />
      ) : null}

      {state.balance ? <MemberPositionsList members={state.balance.by_member} /> : null}

      <ProfitConfigCard
        group={group}
        members={state.members}
        canEdit={state.isModeratorOrAbove}
        onEditGroup={() => mutations.actions.openEditGroup(group)}
      />

      {state.isModeratorOrAbove ? (
        <MembersList
          members={state.members}
          canEdit={state.isModeratorOrAbove}
          onEdit={(member) => mutations.actions.openEditMember(member)}
        />
      ) : null}

      <MovementsPreview
        movements={state.recentMovements}
        loading={state.loadingMovements}
        total={state.movementsTotal}
        historyHref={`/admin/funds/${groupUuid}/movements`}
        getUserDisplayName={state.getUserDisplayName}
      />

      <FundDialogs mutations={mutations} resources={resources} />
    </div>
  );
}
