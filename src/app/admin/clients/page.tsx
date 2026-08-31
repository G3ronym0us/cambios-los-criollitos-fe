'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ClientsFilters } from './_components/ClientsFilters';
import { ClientsList } from './_components/ClientsList';
import { ClientsPendingSummary } from './_components/ClientsPendingSummary';
import { NewEntityDialog } from './_components/NewEntityDialog';
import { useClients } from './_hooks/useClients';

/**
 * El directorio de clientes: un solo panel —cabecera, filtros, resumen y filas—.
 *
 * Es una lista y no una rejilla de tarjetas porque con cientos de clientes lo que se hace
 * aquí es barrer buscando a uno; en filas caben tres veces más por pantalla. El censo de
 * bloqueados y seguidos que había arriba tampoco cambiaba lo que haces: cada cliente lleva
 * su insignia en la fila.
 */
export default function ClientsAdminPage() {
  const { state, actions } = useClients();
  const [entityOpen, setEntityOpen] = useState(false);

  return (
    <div className="space-y-4">
      <NewEntityDialog
        open={entityOpen}
        onOpenChange={setEntityOpen}
        onCreate={actions.createEntity}
      />

      <Card className="overflow-hidden py-0">
        <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground sm:text-xl">Clientes</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Clientes del bot de WhatsApp: nombres, seguimiento y bloqueos.
              {state.total > 0 ? <> · {state.total} en total</> : null}
            </p>
          </div>
          <Button variant="outline" className="shrink-0" onClick={() => setEntityOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo cliente-entidad
          </Button>
        </header>

        <ClientsFilters
          filters={state.filters}
          hasActiveFilters={state.hasActiveFilters}
          pairs={state.pairs}
          onChange={actions.setFilters}
          onReset={actions.resetFilters}
        />

        {/* La franja sólo tiene sentido cuando hay deuda a la vista que resumir. */}
        {!state.loading && state.pendingSummary.clients > 0 ? (
          <ClientsPendingSummary
            clients={state.pendingSummary.clients}
            totals={state.pendingSummary.totals}
            capped={state.pendingSummary.capped}
            sort={state.sort}
            onSort={actions.setSort}
          />
        ) : null}

        <ClientsList
          clients={state.clients}
          loading={state.loading}
          error={state.error}
          hasActiveFilters={state.hasActiveFilters}
          hiddenCount={state.hiddenCount}
          onResetFilters={actions.resetFilters}
          onRetry={actions.reload}
        />
      </Card>
    </div>
  );
}
