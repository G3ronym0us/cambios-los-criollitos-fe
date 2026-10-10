'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ListPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** Con él, el pie dice «Viendo 11–20 de 38» además de la página. */
  pageSize?: number;
  /** Cómo se llaman los elementos, en plural: «operaciones», «movimientos». */
  noun: string;
  onPageChange: (page: number) => void;
}

/** Anterior / siguiente para una lista paginada. Con una sola página no pinta nada. */
export function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  noun,
  onPageChange,
}: ListPaginationProps) {
  if (totalPages <= 1) return null;
  const from = pageSize ? (page - 1) * pageSize + 1 : null;
  const to = pageSize ? Math.min(page * pageSize, total) : null;

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {from !== null && to !== null
          ? `Viendo ${from}–${to} de ${total} ${noun} · página ${page} de ${totalPages}`
          : `Página ${page} de ${totalPages} · ${total} ${noun}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-11 sm:h-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-11 sm:h-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
