'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { fundService } from '@/services/fundService';
import { operationService, type OperationPayments } from '@/services/operationService';
import type { CurrencyPairData } from '@/types/admin';
import type { FundGroup } from '@/types/fund';
import type { OperationData, OperationStatus } from '@/types/operation';

export function useOperationDetail(uuid: string) {
  const [operation, setOperation] = useState<OperationData | null>(null);
  const [payments, setPayments] = useState<OperationPayments | null>(null);
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [funds, setFunds] = useState<FundGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairsLoading, setPairsLoading] = useState(true);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setPaymentsError(null);
    setPairsLoading(true);
    setFundsLoading(true);

    Promise.all([
      operationService.getOperation(uuid),
      operationService.getOperationPayments(uuid),
      adminService.getCurrencyPairs(0, 1000),
      fundService.getGroups(false),
    ]).then(([operationResult, paymentsResult, pairsResult, fundsResult]) => {
      if (!active) return;

      if (operationResult.success && operationResult.data) {
        setOperation(operationResult.data);
      } else {
        setOperation(null);
        setNotFound(true);
      }

      if (paymentsResult.success && paymentsResult.data) {
        setPayments(paymentsResult.data);
      } else {
        setPayments(null);
        setPaymentsError(paymentsResult.error || 'No se pudieron cargar los pagos vinculados.');
      }

      if (pairsResult.success && pairsResult.data) {
        setPairs(pairsResult.data.pairs);
      } else {
        setPairs([]);
      }

      if (fundsResult.success && fundsResult.data) {
        setFunds(fundsResult.data);
      } else {
        setFunds([]);
      }

      setPairsLoading(false);
      setFundsLoading(false);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [uuid]);

  // Refresca los pagos vinculados (tras vincular uno desde el detalle).
  const reloadPayments = useCallback(async () => {
    const result = await operationService.getOperationPayments(uuid);
    if (result.success && result.data) {
      setPayments(result.data);
      setPaymentsError(null);
    } else {
      setPaymentsError(result.error || 'No se pudieron cargar los pagos vinculados.');
    }
  }, [uuid]);

  const updatePair = async (currencyPairUuid: string) => {
    const result = await operationService.updatePair(uuid, currencyPairUuid);
    if (result.success && result.data) {
      setOperation(result.data);
    }
    return result;
  };

  const updateFund = async (fundGroupUuid: string | null) => {
    const result = await operationService.updateFund(uuid, fundGroupUuid);
    if (result.success && result.data) {
      setOperation(result.data);
    }
    return result;
  };

  const updateDetails = async (
    currencyPairUuid: string,
    appliedPercentage: number | null,
    status: OperationStatus,
  ) => {
    let updatedOperation = operation;

    const administrativeChanges = {
      ...(currencyPairUuid !== operation?.currency_pair_uuid
        ? { currency_pair_uuid: currencyPairUuid }
        : {}),
      ...(appliedPercentage !== null && appliedPercentage !== operation?.applied_percentage
        ? { applied_percentage: appliedPercentage }
        : {}),
    };

    if (Object.keys(administrativeChanges).length > 0) {
      const detailsResult = await operationService.updateDetails(uuid, administrativeChanges);
      if (!detailsResult.success || !detailsResult.data) return detailsResult;
      updatedOperation = detailsResult.data;
      setOperation(detailsResult.data);
    }

    if (status !== updatedOperation?.status) {
      const statusResult = await operationService.updateStatus(uuid, status);
      if (!statusResult.success || !statusResult.data) return statusResult;
      updatedOperation = statusResult.data;
      setOperation(statusResult.data);
    }

    return { success: true, data: updatedOperation ?? undefined };
  };

  // Marca la entrega de USD efectivo como recibida (PENDING → RECEIVED).
  const markDelivered = async () => {
    const result = await operationService.markDelivered(uuid);
    if (result.success && result.data) {
      setOperation(result.data);
    }
    return result;
  };

  // Corrección retroactiva de una op COMPLETED (monto realmente cambiado);
  // el backend acredita el excedente como saldo a favor y sincroniza la transacción.
  const partialSettle = async (settleAmount: number) => {
    const result = await operationService.partialSettle(uuid, settleAmount);
    if (result.success && result.data) {
      setOperation(result.data.operation);
    }
    return result;
  };

  return {
    operation,
    payments,
    pairs,
    funds,
    loading,
    pairsLoading,
    fundsLoading,
    notFound,
    paymentsError,
    reloadPayments,
    updatePair,
    updateFund,
    updateDetails,
    partialSettle,
    markDelivered,
  };
}
