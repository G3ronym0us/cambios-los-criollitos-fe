import { Fragment } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

/** Migas de pan para las pantallas de detalle e historial de Fondos. */
export function FundsBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            ) : null}
          </Fragment>
        );
      })}
    </nav>
  );
}
