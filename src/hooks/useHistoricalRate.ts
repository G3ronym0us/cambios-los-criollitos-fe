'use client';

import { useEffect, useState } from 'react';
import { ratesService } from '@/services/ratesService';
import type { ExchangeRateResponse } from '@/types/currency';

/** datetime-local representa la zona del dispositivo, no UTC. */
export function localDateTimeToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('Indica una fecha y hora válidas.');
  }
  const date = new Date(value);
  const [year, month, day, hour, minute] = value.split(/\D/).map(Number);
  if (!Number.isFinite(date.getTime()) || date.getFullYear() !== year ||
      date.getMonth() !== month - 1 || date.getDate() !== day ||
      date.getHours() !== hour || date.getMinutes() !== minute) {
    throw new Error('Indica una fecha y hora válidas.');
  }
  if (date.getTime() > Date.now()) throw new Error('La fecha y hora no pueden estar en el futuro.');
  return date.toISOString();
}

export function useHistoricalRate(enabled: boolean, pairUuid?: string) {
  const [at, setAt] = useState<string | null>(null);
  const [validationError, setValidationError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{
    pairUuid?: string; at: string; rate: ExchangeRateResponse | null; error: string; attempt: number;
  } | null>(null);
  const selectedAt = enabled ? at : null;
  const matches = response?.pairUuid === pairUuid && response?.at === selectedAt && response?.attempt === attempt;

  useEffect(() => {
    if (!enabled) { setAt(null); setResponse(null); setValidationError(''); }
  }, [enabled]);

  useEffect(() => {
    if (!selectedAt) return;
    let cancelled = false;
    const finish = (rate: ExchangeRateResponse | null, error: string) => {
      if (!cancelled) setResponse({ pairUuid, at: selectedAt, rate, error, attempt });
    };
    if (!pairUuid) {
      finish(null, 'No hay un par disponible para consultar su historial. Selecciona otras monedas.');
      return;
    }
    ratesService.getHistoricalRate(pairUuid, selectedAt).then(result => {
      if (result.success && result.data) finish(result.data, '');
      else {
        const missing = !result.error || result.error.startsWith('No rate found for pair');
        finish(null, missing ? 'No hay una tasa registrada para ese par en la fecha y hora indicadas.' : result.error!);
      }
    }).catch(() => finish(null, 'No se pudo consultar el historial. Intenta de nuevo.'));
    return () => { cancelled = true; };
  }, [pairUuid, selectedAt, attempt]);

  return {
    at: selectedAt,
    rate: selectedAt && matches ? response!.rate : null,
    loading: !!selectedAt && !matches,
    error: enabled ? validationError || (selectedAt && matches ? response!.error : '') : '',
    load(value: string) {
      if (!enabled) return;
      try {
        const iso = localDateTimeToIso(value);
        setValidationError('');
        setAt(iso);
        setAttempt(n => n + 1);
      } catch (error) {
        setValidationError((error as Error).message);
      }
    },
    reset() { setAt(null); setResponse(null); setValidationError(''); },
  };
}
