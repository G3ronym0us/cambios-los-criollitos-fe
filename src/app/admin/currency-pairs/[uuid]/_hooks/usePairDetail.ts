'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AdminService } from '@/services/adminService';
import { CurrencyPairData, UpdateCurrencyPairData } from '@/types/admin';
import type { CurrencyPairFormData } from '../../_components/sections/formShared';

const adminService = new AdminService();

export function usePairDetail(uuid: string) {
  const [pair, setPair] = useState<CurrencyPairData | null>(null);
  const [basePairs, setBasePairs] = useState<CurrencyPairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const loadPair = useCallback(async () => {
    setLoading(true);
    const result = await adminService.getCurrencyPair(uuid);
    if (result.success && result.data) {
      setPair(result.data);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }, [uuid]);

  useEffect(() => {
    loadPair();
  }, [loadPair]);

  useEffect(() => {
    const loadBasePairs = async () => {
      const result = await adminService.getBasePairs();
      if (result.success && result.data) setBasePairs(result.data);
    };
    loadBasePairs();
  }, []);

  /** Símbolo de la moneda FIAT del par, o null si ninguna lo es (no aplica Binance). */
  const fiatSymbol = pair
    ? pair.from_currency.currency_type === 'FIAT'
      ? pair.from_currency.symbol
      : pair.to_currency.currency_type === 'FIAT'
        ? pair.to_currency.symbol
        : null
    : null;

  const validateBinance = useCallback(
    async (data: CurrencyPairFormData): Promise<boolean> => {
      setError('');
      if (!data.binance_tracked) return true;

      if (!data.banks_to_track?.length) {
        setError('Debe seleccionar al menos un método de pago');
        return false;
      }
      if (!data.amount_to_track || data.amount_to_track <= 0) {
        setError('El monto debe ser mayor a 0');
        return false;
      }
      if (!fiatSymbol) return true;

      // Binance es la fuente de verdad de los métodos válidos por FIAT; si la
      // consulta falla dejamos pasar para no bloquear el guardado.
      const result = await adminService.getBinanceTradeMethodsByUrl(fiatSymbol);
      if (!result.success || !result.data) return true;

      const validMethods = result.data.map((method) => method.identifier);
      const invalid = data.banks_to_track.filter((m) => !validMethods.includes(m));
      if (invalid.length > 0) {
        setError(`Métodos de pago inválidos para ${fiatSymbol}: ${invalid.join(', ')}`);
        return false;
      }
      return true;
    },
    [fiatSymbol]
  );

  const save = useCallback(
    async (data: CurrencyPairFormData): Promise<boolean> => {
      if (!pair) return false;

      const valid = await validateBinance(data);
      if (!valid) return false;

      // Las monedas del par no se pueden cambiar una vez creado.
      const { from_currency_uuid: _from, to_currency_uuid: _to, ...updateData } = data;
      void _from;
      void _to;

      const result = await adminService.updateCurrencyPair(
        pair.uuid,
        updateData as UpdateCurrencyPairData
      );
      if (!result.success) {
        toast.error(result.error || 'Error al actualizar el par');
        return false;
      }

      if (result.data) setPair(result.data);
      setError('');
      toast.success('Par actualizado correctamente');
      return true;
    },
    [pair, validateBinance]
  );

  return {
    state: { pair, basePairs, loading, notFound, error, fiatSymbol },
    actions: { setError, save, reload: loadPair },
  };
}
