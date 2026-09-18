'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AdminService } from '@/services/adminService';
import { fundService } from '@/services/fundService';
import { CurrencyPairData, DerivedPairData, UpdateCurrencyPairData } from '@/types/admin';
import type { FundGroup } from '@/types/fund';
import type { CurrencyPairFormData } from '../../_components/sections/formShared';

const adminService = new AdminService();

export function usePairDetail(uuid: string) {
  const [pair, setPair] = useState<CurrencyPairData | null>(null);
  const [basePairs, setBasePairs] = useState<CurrencyPairData[]>([]);
  const [derivedPairs, setDerivedPairs] = useState<DerivedPairData[]>([]);
  const [funds, setFunds] = useState<FundGroup[]>([]);
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

  // Los fondos activos, para elegir el fondo por defecto de cada pata.
  useEffect(() => {
    fundService.getGroups().then((result) => {
      if (result.success && result.data) setFunds(result.data.filter((g) => g.is_active));
    });
  }, []);

  // Apagar un par base arrastra a sus derivados: hay que poder avisarlo antes.
  useEffect(() => {
    const loadDerived = async () => {
      const result = await adminService.getDerivedPairs(uuid);
      setDerivedPairs(result.success && result.data ? result.data : []);
    };
    loadDerived();
  }, [uuid]);

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
        // El motivo del backend (ej. «un porcentaje sin su fondo») queda visible junto al
        // botón, no solo en un toast que se va.
        setError(result.error || '');
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
    state: { pair, basePairs, derivedPairs, funds, loading, notFound, error, fiatSymbol },
    actions: { setError, save, reload: loadPair },
  };
}
