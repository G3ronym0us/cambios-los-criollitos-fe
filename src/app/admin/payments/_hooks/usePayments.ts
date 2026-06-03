'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { paymentService } from '@/services/paymentService';
import { PaymentData, PaymentTable } from '@/types/payment';

export type OutgoingClass = 'ALL' | 'OPERATIONAL' | 'PERSONAL' | 'IRRELEVANT';

function matchSearch(p: PaymentData, q: string) {
  if (!q) return true;
  return (
    (p.client_name || '').toLowerCase().includes(q) ||
    (p.client_phone || '').toLowerCase().includes(q) ||
    (p.bank_from || '').toLowerCase().includes(q) ||
    (p.bank_to || '').toLowerCase().includes(q) ||
    (p.reference || '').toLowerCase().includes(q) ||
    (p.provider || '').toLowerCase().includes(q)
  );
}

export function usePayments() {
  const [incoming, setIncoming] = useState<PaymentData[]>([]);
  const [outgoing, setOutgoing] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PaymentTable>('incoming');
  const [search, setSearch] = useState('');
  const [outClass, setOutClass] = useState<OutgoingClass>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    const [inc, out] = await Promise.all([
      paymentService.getPayments('incoming', 500),
      paymentService.getPayments('outgoing', 1000),
    ]);
    if (inc.success && inc.data) setIncoming(inc.data);
    else toast.error(inc.error || 'Error al cargar pagos entrantes');
    if (out.success && out.data) setOutgoing(out.data);
    else toast.error(out.error || 'Error al cargar pagos salientes');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredIncoming = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incoming.filter((p) => matchSearch(p, q));
  }, [incoming, search]);

  const filteredOutgoing = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outgoing.filter((p) => {
      const personal = !!p.is_personal_expense;
      const irrelevant = !!p.is_irrelevant;
      if (outClass === 'OPERATIONAL' && (personal || irrelevant)) return false;
      if (outClass === 'PERSONAL' && !personal) return false;
      if (outClass === 'IRRELEVANT' && !irrelevant) return false;
      return matchSearch(p, q);
    });
  }, [outgoing, search, outClass]);

  const hasActiveFilters = search.trim() !== '' || outClass !== 'ALL';
  const resetFilters = useCallback(() => {
    setSearch('');
    setOutClass('ALL');
  }, []);

  return {
    state: {
      incoming: filteredIncoming,
      outgoing: filteredOutgoing,
      totalIncoming: incoming.length,
      totalOutgoing: outgoing.length,
      loading,
      tab,
      search,
      outClass,
      hasActiveFilters,
    },
    actions: { setTab, setSearch, setOutClass, resetFilters, reload: load },
  };
}
