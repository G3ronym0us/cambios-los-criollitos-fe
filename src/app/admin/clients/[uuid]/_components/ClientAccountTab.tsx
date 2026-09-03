'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, HandCoins, SlidersHorizontal, Truck, Wallet } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { cn } from '@/lib/utils';
import type { BalanceAdjust, BalanceSummary, LoanTotals } from '@/types/client';
import type { OperationData } from '@/types/operation';
import {
  accountCounts,
  accountPairs,
  accountThread,
  type AccountFilter,
} from '../../_lib/account';
import {
  formatPendingBreakdown,
  isCashDebt,
  isPendingOperation,
  pendingByPair,
  pendingTotals,
  waitedFor,
} from '../../_lib/pending';
import { useClientPending } from '../_hooks/useClientPending';
import { AccountThread } from './AccountThread';
import { BalanceAdjustDialog } from './BalanceAdjustDialog';
import { PendingWorkList } from './PendingWorkList';

interface ClientAccountTabProps {
  clientUuid: string;
  operations: OperationData[];
  operationsLoading: boolean;
  balance: BalanceSummary | null;
  balanceLoading: boolean;
  loanTotals: LoanTotals | null;
  hasOpenLoan: boolean;
  onAdjustBalance: (data: BalanceAdjust) => Promise<boolean>;
  onChanged: () => void;
}

const FILTER_LABEL: Record<AccountFilter, string> = {
  all: 'Todo',
  pending: 'Por entregar',
  delivered: 'Entregado',
  balance: 'Saldo',
};

const ORDER: AccountFilter[] = ['all', 'pending', 'delivered', 'balance'];

/** El `<Select>` no admite valor vacío, y «todos los pares» es justo el par sin elegir. */
const ALL_PAIRS = '__all__';

const EMPTY_LABEL: Record<AccountFilter, string> = {
  all: 'Este cliente todavía no tiene movimientos.',
  pending: 'No le debemos nada.',
  delivered: 'Todavía no hay operaciones entregadas.',
  balance: 'Sin créditos ni abonos. Acredita un pago entrante desde Pagos, o ajusta el saldo.',
};

function Chip({
  active,
  count,
  children,
  onClick,
}: {
  active: boolean;
  count?: number;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
      {count != null ? <span className="ml-1 tabular-nums opacity-80">· {count}</span> : null}
    </button>
  );
}

/** Una de las tres posiciones de la cabecera. Cada una en su moneda: no hay total único. */
function Position({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  action,
  big,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail?: string | null;
  tone: 'debt' | 'credit' | 'owed';
  action?: React.ReactNode;
  /** La cifra de la que va la pestaña: se lee desde lejos, no compite con nada. */
  big?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-56 items-start gap-3">
      <span
        aria-hidden
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          tone === 'debt' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
          tone === 'credit' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          tone === 'owed' && 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'font-bold tabular-nums text-foreground',
            big ? 'text-2xl sm:text-3xl' : 'text-lg',
          )}
        >
          {value}
        </p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
        {action}
      </div>
    </div>
  );
}

/**
 * «Cuenta»: lo que antes eran tres pestañas —Transacciones, Por entregar y Saldo—.
 *
 * Eran el mismo hilo contado tres veces, así que el tipo pasa a ser un filtro. Con «Por
 * entregar» la lista deja de ser un histórico que se consulta y se convierte en una cola de
 * trabajo, con selección múltiple y reparto: por eso ese filtro renderiza otra cosa.
 *
 * La cabecera enseña las tres posiciones a la vez —le debemos / saldo a favor / nos debe—
 * porque no se pueden sumar: viven en monedas distintas y no hay tasa que las una sin
 * inventarla. «Nos debe» está sólo como aviso; los préstamos se trabajan en su pestaña.
 */
export function ClientAccountTab({
  clientUuid,
  operations,
  operationsLoading,
  balance,
  balanceLoading,
  loanTotals,
  hasOpenLoan,
  onAdjustBalance,
  onChanged,
}: ClientAccountTabProps) {
  /**
   * `null` = el operador no ha elegido todavía, y entonces manda el dato: si al cliente se
   * le debe algo, la pestaña abre en «Por entregar», que es la lista de trabajo y lo que
   * dibuja el diseño. Abrir siempre en «Todo» dejaba al operador en el histórico teniendo
   * siete operaciones sin cubrir a un clic. En cuanto toca un chip, su elección manda.
   */
  const [chosenFilter, setChosenFilter] = useState<AccountFilter | null>(null);
  /**
   * El automático se decide UNA vez, con los datos de la primera carga, y ya no se mueve.
   *
   * Derivarlo en cada render fue un error con consecuencias: al marcar la ÚLTIMA operación
   * pendiente el contador llegaba a cero, el filtro saltaba solo de «Por entregar» a «Todo»
   * y la lista de trabajo se cambiaba por el histórico debajo del ratón. Desde fuera parecía
   * que las que acababas de marcar se habían desmarcado — perdían su «Deshacer» y volvían a
   * salir como una fila más del hilo.
   */
  const autoFilter = useRef<AccountFilter | null>(null);
  const [pair, setPair] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const entries = useMemo(() => balance?.entries ?? [], [balance]);
  const counts = useMemo(
    () => accountCounts(operations, entries, pair),
    [operations, entries, pair],
  );
  const pairs = useMemo(() => accountPairs(operations), [operations]);

  const scopedOperations = useMemo(
    () => (pair ? operations.filter((op) => op.pair_symbol === pair) : operations),
    [operations, pair],
  );

  const pendingEntries = useMemo(
    () => pendingByPair(scopedOperations.filter(isPendingOperation)),
    [scopedOperations],
  );
  const pendingTotal = pendingTotals(pendingEntries);
  const waited = waitedFor(pendingTotal.oldest_at);

  // El filtro se resuelve ANTES del hilo, que es quien lo consume.
  if (autoFilter.current === null && !operationsLoading) {
    autoFilter.current = pendingTotal.operations > 0 ? 'pending' : 'all';
  }
  const filter: AccountFilter = chosenFilter ?? autoFilter.current ?? 'all';
  const setFilter = setChosenFilter;

  const items = useMemo(
    () => accountThread(operations, entries, filter, { pair }),
    [operations, entries, filter, pair],
  );

  // En un par de efectivo la cifra pendiente significa lo contrario: los bolívares ya
  // salieron y lo que falta es el efectivo del cliente. Mismo número, rótulo opuesto.
  const cashDebt = isCashDebt(pendingEntries);

  /**
   * La cola de «por entregar» se gobierna desde aquí, no desde la lista, porque la
   * cabecera de la pestaña ofrece «Entregar todo»: un botón que enciende la selección de
   * una lista que aún puede estar oculta detrás de otro filtro.
   */
  const pending = useClientPending(clientUuid, scopedOperations, onChanged);

  const deliverAll = () => {
    setFilter('pending');
    pending.actions.setMode('select');
    pending.actions.selectAll();
  };

  const firstLoad = (operationsLoading && operations.length === 0) || (balanceLoading && !balance);
  if (firstLoad) return <LoadingState label="Cargando la cuenta..." />;

  const owed = loanTotals?.by_reference ?? [];

  return (
    <div className="space-y-4">
      {/* La cabecera del diseño es UNA cifra grande y su acción, no tres columnas. Saldo y
          préstamos sólo aparecen cuando existen: enseñar «$0,00 · 0 movimientos» y «Nada ·
          sin préstamos abiertos» gastaba dos tercios del ancho en decir que no hay nada. */}
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-6">
          <Position
            icon={Truck}
            label={cashDebt ? 'Nos debe en efectivo' : 'Le debemos'}
            value={
              pendingTotal.operations > 0 ? formatPendingBreakdown(pendingEntries) : 'Nada'
            }
            detail={
              pendingTotal.operations > 0
                ? // Sólo la moneda de la deuda. El equivalente en la moneda de pago salía
                  // de la tasa cotizada, no de la real, y en pantalla no decidía nada:
                  // quien va a cobrar o entregar razona en la moneda en que se debe.
                  [
                    `${pendingTotal.operations} ${pendingTotal.operations === 1 ? 'operación' : 'operaciones'}`,
                    waited ? `desde hace ${waited}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'todo cubierto'
            }
            tone={cashDebt ? 'owed' : 'debt'}
            big
          />

          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            {pending.state.selectable.length > 0 ? (
              <Button size="sm" onClick={deliverAll}>
                <Truck className="h-4 w-4" />
                {cashDebt ? 'Marcar todo cobrado' : 'Entregar todo'}
              </Button>
            ) : null}

            {/* Las otras dos posiciones, en una línea y sólo si dicen algo. No se suman con
                la de arriba —viven en monedas distintas— pero tienen que avisar sin obligar
                a cambiar de pestaña. */}
            {(balance?.balance ?? 0) !== 0 ? (
              <p className="text-xs text-muted-foreground">
                <Wallet className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-emerald-600" />
                Saldo a favor{' '}
                <strong className="font-semibold tabular-nums text-foreground">
                  ${(balance?.balance ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </strong>
              </p>
            ) : null}

            {owed.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                <HandCoins className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-sky-700" />
                Nos debe{' '}
                <strong className="font-semibold tabular-nums text-foreground">
                  {owed
                    .map(
                      (total) =>
                        `${total.amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${total.currency}`,
                    )
                    .join(' + ')}
                </strong>{' '}
                en préstamos
              </p>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setAdjusting(true)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ajustar saldo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Los chips no envuelven: ruedan. Cuatro chips con su contador más el selector de
          par de sobra en 390 px — envolver los saltaba a dos líneas con el selector
          colgando solo en la segunda. En «Por entregar» el selector además baja a la fila
          de «Repartir un monto» en móvil (ver `PendingWorkList`), que es donde el diseño
          lo acota; aquí se queda oculto para ese filtro y sigue disponible en ≥lg. */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {ORDER.map((option) => (
          <Chip
            key={option}
            active={filter === option}
            count={counts[option]}
            onClick={() => setFilter(option)}
          >
            {/* En un par de efectivo la cola no es de entregas sino de cobros: los
                bolívares ya salieron y lo que falta es el efectivo del cliente. Mismo
                filtro, rótulo opuesto — igual que la cifra de arriba. */}
            {option === 'pending' && cashDebt ? 'Por cobrar' : FILTER_LABEL[option]}
          </Chip>
        ))}

        {/* El par es un desplegable y no otra fila de chips: no es del mismo orden que el
            tipo de movimiento —acota lo que ya se eligió— y con cinco pares la fila de
            chips tapaba los cuatro filtros que sí mandan. */}
        {pairs.length > 0 && filter !== 'balance' ? (
          <Select
            value={pair === '' ? ALL_PAIRS : pair}
            onValueChange={(value) => setPair(value === ALL_PAIRS ? '' : (value as string))}
          >
            <SelectTrigger
              aria-label="Par de monedas"
              className={cn(
                'ml-auto h-9 w-auto min-w-36 shrink-0 rounded-full',
                filter === 'pending' && 'hidden lg:flex',
              )}
            >
              <SelectValue placeholder="Todos los pares" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PAIRS}>Todos los pares</SelectItem>
              {pairs.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {filter === 'all' && pair ? (
        <p className="text-xs text-muted-foreground">
          Con un par elegido no se enseñan los movimientos de saldo: el saldo a favor es un
          ledger en USD y no pertenece a ningún par.
        </p>
      ) : null}

      {/* Los dos modos se quedan montados y se esconde el inactivo. Renderizar sólo uno
          desmontaba la cola de trabajo en cada clic de chip, y con ella lo seleccionado, el
          monto escrito y lo que se podía deshacer. */}
      <div hidden={filter !== 'pending'}>
        <PendingWorkList
          state={pending.state}
          actions={pending.actions}
          onChanged={onChanged}
          pairs={pairs}
          pair={pair}
          onPairChange={setPair}
        />
      </div>
      <div hidden={filter === 'pending'}>
        <AccountThread items={items} emptyLabel={EMPTY_LABEL[filter]} />
      </div>

      {hasOpenLoan && filter === 'pending' ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Este cliente además tiene un{' '}
            <strong className="font-semibold text-foreground">préstamo abierto</strong>. Son cosas
            distintas: el préstamo es plata que él nos debe, esto es plata que le debemos. No se
            compensan solas — si quieres cruzarlas, se hace desde la pestaña Préstamos y queda
            registrado.
          </p>
        </div>
      ) : null}

      <BalanceAdjustDialog open={adjusting} onOpenChange={setAdjusting} onAdjust={onAdjustBalance} />
    </div>
  );
}
