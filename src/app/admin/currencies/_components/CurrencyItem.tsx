'use client';

import { Bitcoin, Edit, Landmark, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyType, type CurrencyData } from '@/types/admin';

interface CurrencyItemProps {
  currency: CurrencyData;
  onEdit: (currency: CurrencyData) => void;
  onDelete: (currency: CurrencyData) => void;
}

export function CurrencyItem({ currency, onEdit, onDelete }: CurrencyItemProps) {
  const isCrypto = currency.currency_type === CurrencyType.CRYPTO;
  const accentBg = isCrypto
    ? 'from-amber-500/80 to-amber-600'
    : 'from-emerald-500/80 to-emerald-600';

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4 sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              aria-hidden
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentBg} text-white`}
            >
              <span className="text-sm font-bold">{currency.symbol.slice(0, 3)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                  {currency.name}
                </h3>
                <StatusBadge
                  tone={isCrypto ? 'warning' : 'success'}
                  icon={isCrypto ? Bitcoin : Landmark}
                >
                  {isCrypto ? 'Crypto' : 'Fiat'}
                </StatusBadge>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">{currency.symbol}</span>
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  aria-label={`Acciones para ${currency.name}`}
                  className="min-h-11 min-w-11"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuItem onClick={() => onEdit(currency)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(currency)}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {currency.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{currency.description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
