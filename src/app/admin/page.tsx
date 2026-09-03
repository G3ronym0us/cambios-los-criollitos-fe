'use client';

import { AlertCircle, RotateCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Role } from '@/utils/enums';
import { OverviewHeader } from './_components/OverviewHeader';
import { WorkGrid } from './_components/WorkGrid';
import { DayGrid } from './_components/DayGrid';
import { WatchStrip } from './_components/WatchStrip';
import { useOverview } from './_hooks/useOverview';

/**
 * La home del panel: un tablero de estado, no un segundo menú.
 *
 * Cada módulo ya calcula lo accionable en el servidor (`GET /admin/overview`, recortado
 * por rol); esta pantalla solo lee esas cifras. Un clic sobre cualquiera de ellas abre su
 * bandeja ya filtrada — de aquí no se hace nada más.
 */
export default function AdminDashboard() {
  const { user } = useAuth();
  const { state, actions } = useOverview();
  const { overview, loading, fatalError } = state;

  const isRoot = user?.role === Role.ROOT;

  if (fatalError && !overview) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 p-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-foreground">No se pudo cargar el tablero</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{fatalError}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={actions.refresh}>
          <RotateCw className="h-3.5 w-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  const errors = overview?.errors ?? [];
  // El rol lo resuelve el servidor: si `alerts`/`clients` llegan (aunque sea `null` por un
  // fallo), es porque el backend ya decidió que este usuario es ROOT. No se repite el
  // chequeo por CSS.
  const showWatch = isRoot && overview != null && ('alerts' in overview || 'clients' in overview);

  return (
    <div className="space-y-6">
      <OverviewHeader
        needsAttention={overview?.payments?.needs_attention ?? null}
        generatedAt={overview?.generated_at ?? null}
        loading={loading}
        onRefresh={actions.refresh}
      />

      <WorkGrid
        payments={overview?.payments}
        operations={overview?.operations}
        errors={errors}
        loading={loading}
        onRetry={actions.refresh}
      />

      <DayGrid
        payments={overview?.payments}
        operations={overview?.operations}
        me={overview?.me}
        errors={errors}
        loading={loading}
        onRetry={actions.refresh}
      />

      {showWatch ? (
        <WatchStrip
          alerts={overview?.alerts}
          clients={overview?.clients}
          errors={errors}
          loading={loading}
          onRetry={actions.refresh}
        />
      ) : null}
    </div>
  );
}
