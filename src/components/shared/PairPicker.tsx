'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CurrencyPairData } from '@/types/admin';

/**
 * Selector de par, compartido por dos pantallas con la misma necesidad: elegir un par entre
 * dos docenas sin obligar a leerlas en orden alfabético. Abre ya resuelto: primero los pares
 * que ESTE cliente sí usa —con cuántas operaciones lleva en cada uno—, y sólo al final el
 * resto. Cada fila trae la tasa vigente y su antigüedad para no tener que abrir otra pantalla
 * a comprobarla, y marca la que está vieja: cotizar con una tasa rancia es un error caro y
 * silencioso.
 *
 * El listado se despliega en el mismo sitio en vez de flotar: se consulta mientras se mira
 * el resto del formulario, y un popover encima taparía justo los montos.
 *
 * Los dos consumidores difieren en un punto: «Vincular a operación» tiene un par de
 * REFERENCIA (el por defecto del cliente, que no se está tocando ahí) y por eso se separa
 * arriba con estrella y encabezado «Por defecto de {cliente}». La ficha del cliente en cambio
 * edita justo ESE campo — no hay a qué apuntar, y un encabezado «por defecto de X» sería
 * circular mientras el operador decide cuál es la X. Por eso `preferredUuid` es opcional:
 * quien no tiene un par de referencia (la ficha del cliente) simplemente no lo pasa, y el
 * componente se queda con dos secciones — favoritos y el resto — sin estrella ni encabezado.
 */

export interface PairUsage {
  /** Cuántas operaciones lleva este cliente en el par. */
  count: number;
}

export interface PairRate {
  rate: number;
  /** ISO de la última actualización, para calcular la antigüedad. */
  updatedAt: string | null;
}

interface Props {
  pairs: CurrencyPairData[];
  value: string;
  onChange: (uuid: string) => void;
  /** Par por defecto del cliente: va arriba y se marca con estrella. Omitir cuando el campo
   *  que se está editando ES el par por defecto (ver docstring de arriba). */
  preferredUuid?: string | null;
  /** Nombre del cliente para el encabezado; si falta, se usa un rótulo genérico. */
  clientName?: string | null;
  usage: Map<string, PairUsage>;
  rates: Map<string, PairRate>;
  totalOperations: number;
  disabled?: boolean;
  id?: string;
  /**
   * Ofrece una fila fija «sin par» al principio de la lista, y `value=''` pasa a ser un
   * estado elegido a propósito (se muestra igual que una selección normal) en vez de «todavía
   * no se eligió nada». Sólo lo necesita la ficha del cliente: ahí «sin par preferido» es un
   * valor válido y tiene que poder elegirse desde la lista, no sólo heredarse por defecto.
   */
  clearable?: boolean;
  /** Rótulo de la fila y del botón cuando `value === ''` con `clearable`. */
  clearLabel?: string;
}

/** Más de esto y la tasa se muestra como vieja: hay que mirarla antes de cotizar. */
const STALE_AFTER_MINUTES = 90;

function ageLabel(updatedAt: string | null): { text: string; stale: boolean } {
  if (!updatedAt) return { text: 'sin tasa', stale: true };
  const minutes = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
  if (Number.isNaN(minutes)) return { text: 'sin tasa', stale: true };
  const stale = minutes >= STALE_AFTER_MINUTES;
  if (minutes < 1) return { text: 'recién', stale };
  if (minutes < 60) return { text: `hace ${minutes} min`, stale };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `hace ${hours} h`, stale };
  return { text: `hace ${Math.floor(hours / 24)} d`, stale };
}

function routeLabel(pair: CurrencyPairData): string {
  const from = pair.from_currency?.symbol ?? '';
  const to = pair.to_currency?.symbol ?? '';
  return from && to ? `${from} → ${to}` : pair.display_name;
}

function formatRate(rate: number): string {
  return rate.toLocaleString('es-VE', { maximumFractionDigits: 4 });
}

export function PairPicker({
  pairs,
  value,
  onChange,
  preferredUuid,
  clientName,
  usage,
  rates,
  totalOperations,
  disabled,
  id,
  clearable,
  clearLabel = 'Sin par preferido',
}: Props) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);

  const selected = pairs.find((p) => p.uuid === value);
  const isPreferred = value !== '' && value === preferredUuid;
  const isCleared = clearable && value === '';

  const { preferred, favourites, rest } = useMemo(() => {
    const preferredPair = pairs.find((p) => p.uuid === preferredUuid) ?? null;
    const used = pairs
      .filter((p) => p.uuid !== preferredUuid && (usage.get(p.uuid)?.count ?? 0) > 0)
      .sort((a, b) => (usage.get(b.uuid)?.count ?? 0) - (usage.get(a.uuid)?.count ?? 0));
    const usedIds = new Set([preferredUuid, ...used.map((p) => p.uuid)]);
    return {
      preferred: preferredPair,
      favourites: used,
      rest: pairs.filter((p) => !usedIds.has(p.uuid)),
    };
  }, [pairs, preferredUuid, usage]);

  // Buscar atraviesa las tres secciones: quien escribe ya sabe qué par quiere y no le
  // importa en cuál de ellas cayó.
  const searching = search.trim() !== '';
  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return pairs.filter(
      (p) =>
        p.pair_symbol.toLowerCase().includes(needle) ||
        p.display_name.toLowerCase().includes(needle) ||
        (p.from_currency?.symbol ?? '').toLowerCase().includes(needle) ||
        (p.to_currency?.symbol ?? '').toLowerCase().includes(needle),
    );
  }, [pairs, search]);

  const currencies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pairs) {
      const from = p.from_currency?.symbol;
      if (from) counts.set(from, (counts.get(from) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [pairs]);

  const visibleRest = currencyFilter
    ? rest.filter((p) => p.from_currency?.symbol === currencyFilter)
    : rest;

  const pick = (uuid: string) => {
    onChange(uuid);
    setOpen(false);
    setSearch('');
  };

  const Row = ({ pair, hint }: { pair: CurrencyPairData; hint?: string }) => {
    const rate = rates.get(pair.uuid);
    const age = ageLabel(rate?.updatedAt ?? null);
    const isSelected = pair.uuid === value;
    return (
      <button
        type="button"
        onClick={() => pick(pair.uuid)}
        className={cn(
          'flex min-h-11 w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {pair.uuid === preferredUuid ? (
              <Star className="h-3 w-3 shrink-0 fill-primary text-primary" />
            ) : null}
            <span className="truncate text-sm font-medium text-foreground">
              {pair.pair_symbol}
            </span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {hint ?? routeLabel(pair)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {rate ? (
            <>
              <span className="block font-mono text-sm text-foreground">
                {formatRate(rate.rate)}
              </span>
              <span
                className={cn(
                  'block text-[11px]',
                  age.stale ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                )}
              >
                {age.text}
              </span>
            </>
          ) : (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400">
              Sin tasa
            </span>
          )}
        </span>
      </button>
    );
  };

  const SectionLabel = ({ children, icon }: { children: React.ReactNode; icon?: boolean }) => (
    <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {icon ? <Star className="h-3 w-3 fill-primary text-primary" /> : null}
      {children}
    </div>
  );

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm transition-colors',
          'hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            {isPreferred ? <Star className="h-3 w-3 shrink-0 fill-primary text-primary" /> : null}
            <span className="font-medium text-foreground">{selected.pair_symbol}</span>
            <span className="truncate text-xs text-muted-foreground">{routeLabel(selected)}</span>
          </span>
        ) : isCleared ? (
          // Con `clearable`, value === '' es una elección tan válida como cualquier par: se
          // ve igual de "resuelta" que una fila seleccionada, no como un campo vacío pendiente.
          <span className="font-medium text-foreground">{clearLabel}</span>
        ) : (
          <span className="text-muted-foreground">Selecciona el par</span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* La ayuda sólo aparece cuando la preselección acertó: si el operador ya cambió el
          par, repetirle que es "el de siempre" sería mentira. */}
      {!open && isPreferred ? (
        <p className="text-xs text-muted-foreground">
          Su par de siempre. Cámbialo si este pago es de otra ruta.
        </p>
      ) : null}

      {open ? (
        <div className="rounded-md border border-border bg-card p-1.5 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar par o moneda"
              className="h-9 pl-8"
            />
          </div>

          <div className="max-h-80 overflow-y-auto">
            {searching ? (
              matches.length ? (
                matches.map((p) => <Row key={p.uuid} pair={p} />)
              ) : (
                <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
                  Ningún par coincide con «{search}»
                </p>
              )
            ) : (
              <>
                {/* Fuera de la búsqueda: no es un par, es la ausencia de uno. Va primero
                    porque "quitar el par" es tan legítimo como elegir uno de la lista. */}
                {clearable ? (
                  <button
                    type="button"
                    onClick={() => pick('')}
                    className={cn(
                      'flex min-h-11 w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                      isCleared ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {clearLabel}
                  </button>
                ) : null}

                {preferred ? (
                  <>
                    <SectionLabel icon>
                      Por defecto de {clientName?.trim() || 'este cliente'}
                    </SectionLabel>
                    <Row
                      pair={preferred}
                      hint={
                        usage.get(preferred.uuid)?.count
                          ? `${routeLabel(preferred)} · ${usage.get(preferred.uuid)!.count} de sus ${totalOperations} operaciones`
                          : routeLabel(preferred)
                      }
                    />
                  </>
                ) : null}

                {favourites.length ? (
                  <>
                    <SectionLabel>Sus favoritos · {favourites.length}</SectionLabel>
                    {favourites.map((p) => (
                      <Row
                        key={p.uuid}
                        pair={p}
                        hint={`${routeLabel(p)} · ${usage.get(p.uuid)!.count} ${
                          usage.get(p.uuid)!.count === 1 ? 'operación' : 'operaciones'
                        }`}
                      />
                    ))}
                  </>
                ) : null}

                {rest.length ? (
                  showAll ? (
                    <>
                      <SectionLabel>Los demás · {rest.length}</SectionLabel>
                      {currencies.length > 1 ? (
                        <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
                          <button
                            type="button"
                            onClick={() => setCurrencyFilter(null)}
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
                              currencyFilter === null
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/70',
                            )}
                          >
                            Todos {rest.length}
                          </button>
                          {currencies.map(([symbol]) => {
                            const n = rest.filter((p) => p.from_currency?.symbol === symbol).length;
                            if (!n) return null;
                            return (
                              <button
                                key={symbol}
                                type="button"
                                onClick={() => setCurrencyFilter(symbol)}
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
                                  currencyFilter === symbol
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/70',
                                )}
                              >
                                {symbol} {n}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {visibleRest.map((p) => (
                        <Row key={p.uuid} pair={p} />
                      ))}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium text-primary transition-colors hover:bg-muted"
                    >
                      Ver los otros {rest.length} pares
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
