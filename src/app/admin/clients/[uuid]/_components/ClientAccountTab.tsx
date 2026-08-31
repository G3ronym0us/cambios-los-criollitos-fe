'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, HandCoins, SlidersHorizontal, Truck, Wallet } from 'lucide-react';
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
  isPendingOperation,
  pendingByPair,
  pendingTotals,
  waitedFor,
} from '../../_lib/pending';
import { usePaymentDates } from '../_hooks/usePaymentDates';
import { AccountThread } from './AccountThread';
import { BalanceAdjustDialog } from './BalanceAdjustDialog';
import { PendingWorkList } from './PendingWorkList';

interface ClientAccountTabProps {
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
        'min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors',
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
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail?: string | null;
  tone: 'debt' | 'credit' | 'owed';
  action?: React.ReactNode;
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
        <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
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
  operations,
  operationsLoading,
  balance,
  balanceLoading,
  loanTotals,
  hasOpenLoan,
  onAdjustBalance,
  onChanged,
}: ClientAccountTabProps) {
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [pair, setPair] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Una sola resolución de fechas para toda la pestaña: el hilo y la cola de «por entregar»
  // ordenan por lo mismo, así que una operación no salta de sitio al cambiar de filtro.
  const paymentDates = usePaymentDates(operations);

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

  const items = useMemo(
    () => accountThread(operations, entries, filter, { pair, dates: paymentDates }),
    [operations, entries, filter, pair, paymentDates],
  );

  const pendingEntries = useMemo(
    () => pendingByPair(scopedOperations.filter(isPendingOperation), paymentDates),
    [scopedOperations, paymentDates],
  );
  const pendingTotal = pendingTotals(pendingEntries);
  const waited = waitedFor(pendingTotal.oldest_at);

  const firstLoad = (operationsLoading && operations.length === 0) || (balanceLoading && !balance);
  if (firstLoad) return <LoadingState label="Cargando la cuenta..." />;

  const owed = loanTotals?.by_reference ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap gap-4 p-4 sm:p-6">
          <Position
            icon={Truck}
            label="Le debemos"
            value={
              pendingTotal.operations > 0 ? formatPendingBreakdown(pendingEntries) : 'Nada'
            }
            detail={
              pendingTotal.operations > 0
                ? `${pendingTotal.operations} ${pendingTotal.operations === 1 ? 'operación' : 'operaciones'}${waited ? ` · desde hace ${waited}` : ''}`
                : 'todo cubierto'
            }
            tone="debt"
          />

          <Position
            icon={Wallet}
            label="Saldo a favor"
            value={`$${(balance?.balance ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
            detail={`${counts.balance} ${counts.balance === 1 ? 'movimiento' : 'movimientos'}`}
            tone="credit"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 mt-1 h-8"
                onClick={() => setAdjusting(true)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Ajustar saldo
              </Button>
            }
          />

          <Position
            icon={HandCoins}
            label="Nos debe"
            value={
              owed.length > 0
                ? owed
                    .map(
                      (total) =>
                        `${total.amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${total.currency}`,
                    )
                    .join(' + ')
                : 'Nada'
            }
            detail={hasOpenLoan ? 'préstamo abierto · se trabaja en Préstamos' : 'sin préstamos abiertos'}
            tone="owed"
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {ORDER.map((option) => (
          <Chip
            key={option}
            active={filter === option}
            count={counts[option]}
            onClick={() => setFilter(option)}
          >
            {FILTER_LABEL[option]}
          </Chip>
        ))}

        {pairs.length > 1 && filter !== 'balance' ? (
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <Chip active={pair === ''} onClick={() => setPair('')}>
              Todos los pares
            </Chip>
            {pairs.map((symbol) => (
              <Chip key={symbol} active={pair === symbol} onClick={() => setPair(symbol)}>
                {symbol}
              </Chip>
            ))}
          </span>
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
          operations={scopedOperations}
          paymentDates={paymentDates}
          onChanged={onChanged}
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
