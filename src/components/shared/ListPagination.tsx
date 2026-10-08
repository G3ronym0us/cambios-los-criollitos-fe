'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ListPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** Cómo se llaman los elementos, en plural: «operaciones», «movimientos». */
  noun: string;
  onPageChange: (page: number) => void;
}

/** Anterior / siguiente para una lista paginada. Con una sola página no pinta nada. */
export function ListPagination({ page, totalPages, total, noun, onPageChange }: ListPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages} · {total} {noun}
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
