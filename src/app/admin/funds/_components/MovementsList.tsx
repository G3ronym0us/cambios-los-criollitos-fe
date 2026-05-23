'use client';

import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import type { FundMovement } from '@/types/fund';
import { MovementItem } from './MovementItem';

interface MovementsListProps {
  movements: FundMovement[];
  loading: boolean;
  isRoot: boolean;
  page: number;
  totalPages: number;
  total: number;
  getUserDisplayName: (uuid: string) => string;
  onDelete: (movement: FundMovement) => void;
  onPageChange: (page: number) => void;
}

export function MovementsList({
  movements,
  loading,
  isRoot,
  page,
  totalPages,
  total,
  getUserDisplayName,
  onDelete,
  onPageChange,
}: MovementsListProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/40">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Receipt className="h-5 w-5" />
          Historial de movimientos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {loading && movements.length === 0 ? (
          <LoadingState label="Cargando movimientos..." />
        ) : movements.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No hay movimientos"
            description="No se ha registrado ningún movimiento en este grupo todavía."
          />
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {movements.map((mov) => (
                <MovementItem
                  key={mov.uuid}
                  movement={mov}
                  isRoot={isRoot}
                  getUserDisplayName={getUserDisplayName}
                  onDelete={onDelete}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-col items-center gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {totalPages} · {total} movimientos
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
