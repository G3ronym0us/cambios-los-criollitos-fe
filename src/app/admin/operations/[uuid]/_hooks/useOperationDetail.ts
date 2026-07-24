'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { clientService } from '@/services/clientService';
import { fundService } from '@/services/fundService';
import { operationService, type OperationPayments } from '@/services/operationService';
import { isUnassignedClientPhone } from '@/utils/functions';
import type { CurrencyPairData } from '@/types/admin';
import type { ClientData } from '@/types/client';
import type { FundGroup } from '@/types/fund';
import type { OperationData, OperationStatus } from '@/types/operation';

export function useOperationDetail(uuid: string) {
  const [operation, setOperation] = useState<OperationData | null>(null);
  const [payments, setPayments] = useState<OperationPayments | null>(null);
  const [pairs, setPairs] = useState<CurrencyPairData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [funds, setFunds] = useState<FundGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairsLoading, setPairsLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setPaymentsError(null);
    setPairsLoading(true);
    setClientsLoading(true);
    setFundsLoading(true);

    Promise.all([
      operationService.getOperation(uuid),
      operationService.getOperationPayments(uuid),
      adminService.getCurrencyPairs(0, 1000),
      clientService.getClients({ limit: 500 }),
      fundService.getGroups(false),
    ]).then(([operationResult, paymentsResult, pairsResult, clientsResult, fundsResult]) => {
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

      if (clientsResult.success && clientsResult.data) {
        // Ni los grupos ni los anónimos son asignables como cliente de una operación.
        setClients(clientsResult.data.items.filter((client) => !isUnassignedClientPhone(client.phone)));
      } else {
        setClients([]);
      }

      if (fundsResult.success && fundsResult.data) {
        setFunds(fundsResult.data);
      } else {
        setFunds([]);
      }

      setPairsLoading(false);
      setClientsLoading(false);
      setFundsLoading(false);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [uuid]);

  // Refresca la operación y sus pagos. Vincular un saliente puede corregir
  // automáticamente el cliente si la operación todavía apuntaba a un grupo.
  const reloadPayments = useCallback(async () => {
    const [operationResult, paymentsResult] = await Promise.all([
      operationService.getOperation(uuid),
      operationService.getOperationPayments(uuid),
    ]);
    if (operationResult.success && operationResult.data) {
      setOperation(operationResult.data);
    }
    if (paymentsResult.success && paymentsResult.data) {
      setPayments(paymentsResult.data);
      setPaymentsError(null);
    } else {
      setPaymentsError(paymentsResult.error || 'No se pudieron cargar los pagos vinculados.');
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
    clientPhone: string | null,
  ) => {
    let updatedOperation = operation;

    const administrativeChanges = {
      ...(currencyPairUuid !== operation?.currency_pair_uuid
        ? { currency_pair_uuid: currencyPairUuid }
        : {}),
      ...(appliedPercentage !== null && appliedPercentage !== operation?.applied_percentage
        ? { applied_percentage: appliedPercentage }
        : {}),
      ...(clientPhone && clientPhone !== operation?.client_phone
        ? { client_phone: clientPhone }
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

  // Corrige cuánto vale el trato (sube y baja). El backend reescala la cotización, recorta el
  // reparto de los entrantes si el valor baja y recalcula el estado con lo entregado.
  const updateValue = async (amount: number) => {
    const result = await operationService.updateValue(uuid, amount);
    if (result.success && result.data) {
      setOperation(result.data);
    }
    return result;
  };

  return {
    operation,
    payments,
    pairs,
    clients,
    funds,
    loading,
    pairsLoading,
    clientsLoading,
    fundsLoading,
    notFound,
    paymentsError,
    reloadPayments,
    updatePair,
    updateFund,
    updateDetails,
    updateValue,
    markDelivered,
  };
}
