'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { operationService } from '@/services/operationService';
import { paymentService } from '@/services/paymentService';
import { CurrencyPairData } from '@/types/admin';
import {
  BalanceAdjust,
  BalanceSummary,
  ClientData,
  ClientPendingByPair,
  ClientUpdate,
  LoanData,
  LoanTotals,
  ManualLoanCreate,
} from '@/types/client';
import { OperationData } from '@/types/operation';

/** El máximo que acepta `/operations` por página. */
const PAGE_LIMIT = 500;

export function useClientProfile(uuid: string) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operations, setOperations] = useState<OperationData[]>([]);
  /** Lo pendiente agregado por par, tal como lo calcula el servidor. */
  const [pendingEntries, setPendingEntries] = useState<ClientPendingByPair[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(true);
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loanTotals, setLoanTotals] = useState<LoanTotals | null>(null);

  const loadLoans = useCallback(async () => {
    setLoansLoading(true);
    const result = await clientService.getClientLoans(uuid);
    setLoans(result.success && result.data ? result.data.loans : []);
    setLoanTotals(result.success && result.data ? result.data.totals : null);
    setLoansLoading(false);
  }, [uuid]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  // Saldo a favor + movimientos del ledger.
  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    const result = await clientService.getClientBalance(uuid);
    setBalance(result.success && result.data ? result.data : null);
    setBalanceLoading(false);
  }, [uuid]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  /**
   * Carga el historial del cliente y, aparte, su cola de pendientes calculada en el
   * servidor (`GET /clients/{uuid}/pending`).
   *
   * Qué está pendiente, cuánto falta y desde cuándo NO se decide aquí: lo dice el servidor
   * con la misma consulta que el directorio, y cada operación del historial se marca con
   * eso. Antes se recalculaba en el navegador sobre las 200 operaciones más nuevas, y a un
   * cliente con 518 la deuda vieja se le quedaba fuera: la cuenta decía 0 mientras la lista
   * enseñaba la deuda. El historial se pide entero, por páginas, porque es lo que el hilo
   * enseña y lo que cuentan sus chips.
   */
  const loadOperations = useCallback(async (phone: string) => {
    setOperationsLoading(true);
    const [first, pending] = await Promise.all([
      operationService.getOperations({ phone, limit: PAGE_LIMIT, page: 1 }),
      clientService.getPending(uuid),
    ]);
    const pages = first.success && first.data ? Math.ceil(first.data.total / PAGE_LIMIT) : 0;
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
        operationService.getOperations({ phone, limit: PAGE_LIMIT, page: i + 2 }),
      ),
    );
    const history = [first, ...rest].flatMap((result) =>
      result.success && result.data ? result.data.operations : [],
    );

    const queue = new Map(
      (pending.success && pending.data ? pending.data.operations : []).map((op) => [op.uuid, op]),
    );
    const seen = new Set(history.map((op) => op.uuid));
    setOperations([
      ...history.map((op) => {
        const server = queue.get(op.uuid);
        return server
          ? { ...op, client_pending: true, outstanding_amount: server.outstanding_amount, pending_since: server.pending_since }
          : { ...op, client_pending: false };
      }),
      // Por si el historial no la trajo: la cola manda, no puede quedarse fuera una deuda.
      ...[...queue.values()]
        .filter((op) => !seen.has(op.uuid))
        .map((op) => ({ ...op, client_pending: true })),
    ]);
    setPendingEntries(pending.success && pending.data ? pending.data.by_pair : []);
    setOperationsLoading(false);
  }, [uuid]);

  /**
   * Refresca las operaciones sin tocar el `loading` de la página.
   *
   * `load` levanta el loading general y el perfil entero se sustituye por el spinner, lo que
   * DESMONTA las pestañas. Para un refresco después de una acción eso es fatal: se lleva por
   * delante el estado de la pestaña —lo marcado en la sesión, que es lo único que permite
   * deshacer—, así que la barra de deshacer nunca llegaba a verse. Aquí sólo se recargan las
   * operaciones y el árbol se queda en pie.
   */
  /**
   * Comprobantes del cliente que no respaldan ninguna operación, por lado. Es el aviso de la
   * cabecera: un Zelle sin vincular es dinero que entró y que la cuenta todavía no ve.
   */
  const [unlinked, setUnlinked] = useState<{ incoming: number; outgoing: number }>({
    incoming: 0,
    outgoing: 0,
  });

  const loadUnlinked = useCallback(async () => {
    const [incoming, outgoing] = await Promise.all([
      paymentService.getStats('incoming', { clientUuid: uuid }),
      paymentService.getStats('outgoing', { clientUuid: uuid }),
    ]);
    setUnlinked({
      incoming: incoming.success && incoming.data ? incoming.data.unlinked : 0,
      outgoing: outgoing.success && outgoing.data ? outgoing.data.unlinked : 0,
    });
  }, [uuid]);

  useEffect(() => {
    loadUnlinked();
  }, [loadUnlinked]);

  // Vincular o marcar desde la cuenta puede cambiar la cuenta de sin vincular: se recalcula.
  const reloadOperations = useCallback(async () => {
    loadUnlinked();
    if (client?.phone) await loadOperations(client.phone);
  }, [client?.phone, loadOperations, loadUnlinked]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await clientService.getClient(uuid);
    if (result.success && result.data) {
      setClient(result.data);
      setNotFound(false);
      loadOperations(result.data.phone);
    } else {
      setNotFound(true);
      setOperationsLoading(false);
    }
    setLoading(false);
  }, [uuid, loadOperations]);

  useEffect(() => {
    load();
  }, [load]);

  // Pares activos para el selector del par preferido.
  useEffect(() => {
    adminService.getCurrencyPairs(0, 200, true).then((result) => {
      if (result.success && result.data) setPairs(result.data.pairs);
    });
  }, []);

  // Updater genérico de cualquier campo del cliente (nombre, par, switches).
  // Devuelve true si guardó, para que el caller cierre su drawer de confirmación.
  const updateFields = useCallback(
    async (data: ClientUpdate, successMessage = 'Cliente actualizado'): Promise<boolean> => {
      setSaving(true);
      const result = await clientService.updateClient(uuid, data);
      setSaving(false);
      if (result.success && result.data) {
        toast.success(successMessage);
        setClient(result.data);
        return true;
      }
      toast.error(result.error || 'Error al actualizar el cliente');
      return false;
    },
    [uuid]
  );

  // Ajuste manual del saldo (CREDIT/DEBIT). Refresca el resumen al guardar.
  const adjustBalance = useCallback(
    async (data: BalanceAdjust): Promise<boolean> => {
      const result = await clientService.adjustClientBalance(uuid, data);
      if (result.success) {
        toast.success(data.entry_type === 'CREDIT' ? 'Saldo acreditado' : 'Saldo debitado');
        loadBalance();
        return true;
      }
      toast.error(result.error || 'No se pudo ajustar el saldo');
      return false;
    },
    [uuid, loadBalance]
  );

  const addLoanRepayment = useCallback(
    async (loanUuid: string, amount: number, notes?: string | null): Promise<boolean> => {
      const result = await clientService.addLoanRepayment(uuid, loanUuid, amount, notes);
      if (result.success) {
        toast.success('Abono registrado con las tasas del día');
        loadLoans();
        return true;
      }
      toast.error(result.error || 'No se pudo registrar el abono');
      return false;
    },
    [uuid, loadLoans],
  );

  const createLoan = useCallback(
    async (body: ManualLoanCreate): Promise<boolean> => {
      const result = await clientService.createManualLoan(uuid, body);
      if (!result.success) {
        toast.error(result.error || 'No se pudo registrar el préstamo');
        return false;
      }
      toast.success('Préstamo registrado');
      loadLoans();
      return true;
    },
    [uuid, loadLoans],
  );

  return {
    state: {
      client, loading, notFound, saving, operations, operationsLoading, pairs, pendingEntries,
      balance, balanceLoading, loans, loansLoading, loanTotals, unlinked,
    },
    actions: { updateFields, reload: load, reloadOperations, adjustBalance, addLoanRepayment, createLoan },
  };
}
