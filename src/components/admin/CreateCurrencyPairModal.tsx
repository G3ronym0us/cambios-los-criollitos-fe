"use client";

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Plus } from 'lucide-react';
import {
  CreateCurrencyPairData,
  CurrencyData,
  CurrencyPairData,
  PairType
} from '@/types/admin';
import TradeMethodSelector from '@/components/TradeMethodSelector';

interface CreateCurrencyPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateCurrencyPairData) => Promise<void>;
  currencies: CurrencyData[];
  basePairs: CurrencyPairData[];
  error: string;
  setError: (error: string) => void;
  validateBinanceForm: (formData: CreateCurrencyPairData) => Promise<boolean>;
  getFiatCurrencyFromPair: (fromCurrencyUuid: string, toCurrencyUuid: string) => string | null;
}

const defaultValues: CreateCurrencyPairData = {
  from_currency_uuid: '',
  to_currency_uuid: '',
  base_pair_uuid: undefined,
  derived_percentage: null,
  use_inverse_percentage: false,
  description: '',
  is_active: true,
  is_monitored: true,
  binance_tracked: false,
  banks_to_track: [],
  amount_to_track: null,
  pair_type: PairType.BASE,
  usdt_reference_side: null,
  usdt_manual_rate: null,
  usdt_pair_uuid: null,
  usdt_pair_inverse: false,
};

export default function CreateCurrencyPairModal({
  isOpen,
  onClose,
  onSubmit,
  currencies,
  basePairs,
  error,
  setError,
  validateBinanceForm,
  getFiatCurrencyFromPair,
}: CreateCurrencyPairModalProps) {
  const { control, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateCurrencyPairData>({
    defaultValues
  });

  const watchPairType = watch('pair_type');
  const watchBasePairId = watch('base_pair_uuid');
  const watchBinanceTracked = watch('binance_tracked');
  const watchFromCurrency = watch('from_currency_uuid');
  const watchToCurrency = watch('to_currency_uuid');
  const watchUsdtReferenceSide = watch('usdt_reference_side');
  const watchUsdtPairUuid = watch('usdt_pair_uuid');

  const [usdtMethod, setUsdtMethod] = useState<'manual' | 'dynamic'>('manual');

  useEffect(() => {
    if (!isOpen) {
      reset(defaultValues);
      setError('');
    }
  }, [isOpen, reset, setError]);

  const onSubmitForm = async (data: CreateCurrencyPairData) => {
    if (data.from_currency_uuid === data.to_currency_uuid) {
      setError('Las monedas de origen y destino deben ser diferentes');
      return;
    }

    const isValid = await validateBinanceForm(data);
    if (!isValid) {
      return;
    }

    await onSubmit(data);
  };

  const handleClose = () => {
    reset(defaultValues);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Nuevo Par de Monedas</h3>
        <form onSubmit={handleSubmit(onSubmitForm)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda de Origen
              </label>
              <Controller
                name="from_currency_uuid"
                control={control}
                rules={{
                  required: 'Debe seleccionar una moneda de origen',
                  validate: (value) => value !== '' || 'Debe seleccionar una moneda válida'
                }}
                render={({ field }) => (
                  <select
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 ${errors.from_currency_uuid ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value={0}>Seleccionar moneda...</option>
                    {currencies.map((currency) => (
                      <option key={currency.uuid} value={currency.uuid}>
                        {currency.name} ({currency.symbol}) - {currency.currency_type}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.from_currency_uuid && (
                <p className="text-red-500 text-xs mt-1">{errors.from_currency_uuid.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda de Destino
              </label>
              <Controller
                name="to_currency_uuid"
                control={control}
                rules={{
                  required: 'Debe seleccionar una moneda de destino',
                  validate: (value) => value !== '' || 'Debe seleccionar una moneda válida'
                }}
                render={({ field }) => (
                  <select
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 ${errors.to_currency_uuid ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value={0}>Seleccionar moneda...</option>
                    {currencies.map((currency) => (
                      <option key={currency.uuid} value={currency.uuid}>
                        {currency.name} ({currency.symbol}) - {currency.currency_type}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.to_currency_uuid && (
                <p className="text-red-500 text-xs mt-1">{errors.to_currency_uuid.message}</p>
              )}
            </div>

            {/* Pair Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Par
              </label>
              <Controller
                name="pair_type"
                control={control}
                rules={{ required: 'Debe seleccionar un tipo de par' }}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full border rounded-md px-3 py-2 ${errors.pair_type ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value={PairType.BASE}>🏗 Base - Par obtenido directamente de Binance (FIAT-CRYPTO)</option>
                    <option value={PairType.DERIVED}>🔗 Derivado - Par derivado de un base con porcentaje (ej: Zelle, PayPal)</option>
                    <option value={PairType.CROSS}>🔀 Cruzado - Par cruzado entre dos FIATs usando USDT como intermediario</option>
                  </select>
                )}
              />
              <p className="text-xs text-gray-500 mt-1">
                Seleccione el tipo de par según su método de cálculo
              </p>
            </div>

            {/* Info Banner para pares DERIVED */}
            {watchPairType === PairType.DERIVED && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Información:</strong> Solo se muestran pares BASE activos con tasas disponibles.
                  Los pares en el selector cumplen todas estas condiciones:
                </p>
                <ul className="text-xs text-blue-700 mt-2 ml-4 list-disc">
                  <li>Tipo: <code className="bg-blue-100 px-1 py-0.5 rounded">pair_type = BASE</code></li>
                  <li>Estado: <code className="bg-blue-100 px-1 py-0.5 rounded">is_active = true</code></li>
                  <li>Tasas: <code className="bg-blue-100 px-1 py-0.5 rounded">binance_tracked = true</code> O tiene tasas manuales activas</li>
                </ul>
              </div>
            )}

            {/* Base Pair Selection - Solo para tipo DERIVED */}
            {watchPairType === PairType.DERIVED && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Par Base <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="base_pair_uuid"
                  control={control}
                  rules={{
                    required: watchPairType === PairType.DERIVED ? 'Debe seleccionar un par base' : false
                  }}
                  render={({ field }) => (
                    <select
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className={`w-full border rounded-md px-3 py-2 ${errors.base_pair_uuid ? 'border-red-500' : 'border-gray-300'}`}
                      disabled={basePairs.length === 0}
                    >
                      <option value="">
                        {basePairs.length === 0
                          ? 'No hay pares base disponibles'
                          : 'Seleccione un par base...'}
                      </option>
                      {basePairs.map((pair) => (
                        <option key={pair.uuid} value={pair.uuid}>
                          {pair.display_name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.base_pair_uuid && (
                  <p className="text-red-500 text-xs mt-1">{errors.base_pair_uuid.message}</p>
                )}
                {basePairs.length === 0 ? (
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <p className="text-xs text-yellow-800">
                      ⚠️ No hay pares base disponibles. Cree primero un par BASE activo con rastreo de Binance o establezca tasas manuales.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Todos los pares mostrados ya están validados por el sistema
                  </p>
                )}
              </div>
            )}

            {/* Derived/Cross Percentage */}
            {(watchPairType === PairType.DERIVED && watchBasePairId) || watchPairType === PairType.CROSS ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {watchPairType === PairType.DERIVED ? 'Porcentaje Derivado (%)' : 'Porcentaje Ajuste (%) - Opcional'}
                  </label>
                  <Controller
                    name="derived_percentage"
                    control={control}
                    rules={{
                      min: { value: 0, message: 'El porcentaje debe ser mayor o igual a 0' },
                      max: { value: 100, message: 'El porcentaje debe ser menor o igual a 100' }
                    }}
                    render={({ field }) => (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        className={`w-full border rounded-md px-3 py-2 ${errors.derived_percentage ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="5.50"
                      />
                    )}
                  />
                  {errors.derived_percentage && (
                    <p className="text-red-500 text-xs mt-1">{errors.derived_percentage.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {watchPairType === PairType.DERIVED
                      ? 'Porcentaje a aplicar sobre la tasa del par base (0-100%)'
                      : 'Porcentaje a aplicar sobre la tasa cruzada calculada (0-100%)'}
                  </p>
                </div>

                <div className="flex items-center">
                  <Controller
                    name="use_inverse_percentage"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="mr-2"
                      />
                    )}
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Usar porcentaje inverso
                  </label>
                  <span className="text-xs text-gray-500 ml-2">
                    (Aplicar porcentaje en dirección contraria)
                  </span>
                </div>
              </>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <Controller
                name="description"
                control={control}
                rules={{ required: 'La descripción es requerida' }}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className={`w-full border rounded-md px-3 py-2 ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                    rows={3}
                  />
                )}
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* USDT Configuration */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Configuración USDT</p>

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Lado de referencia
                </label>
                <Controller
                  name="usdt_reference_side"
                  control={control}
                  render={({ field }) => (
                    <select
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Sin configurar</option>
                      <option value="FROM">FROM — monto origen</option>
                      <option value="TO">TO — monto destino</option>
                    </select>
                  )}
                />
              </div>

              {watchUsdtReferenceSide && (
                <>
                  <div className="flex gap-3 mb-3">
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={usdtMethod === 'manual'}
                        onChange={() => { setUsdtMethod('manual'); setValue('usdt_pair_uuid', null); }}
                      />
                      Tasa fija
                    </label>
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={usdtMethod === 'dynamic'}
                        onChange={() => { setUsdtMethod('dynamic'); setValue('usdt_manual_rate', null); }}
                      />
                      Par dinámico
                    </label>
                  </div>

                  {usdtMethod === 'manual' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Tasa USDT fija
                      </label>
                      <Controller
                        name="usdt_manual_rate"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            step="0.000001"
                            min="0"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="Ej: 1.0 para Zelle (1:1 con USDT)"
                          />
                        )}
                      />
                    </div>
                  )}

                  {usdtMethod === 'dynamic' && (
                    <>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Par de referencia
                        </label>
                        <Controller
                          name="usdt_pair_uuid"
                          control={control}
                          render={({ field }) => (
                            <select
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            >
                              <option value="">Seleccionar par...</option>
                              {basePairs.map((p) => (
                                <option key={p.uuid} value={p.uuid}>{p.pair_symbol}</option>
                              ))}
                            </select>
                          )}
                        />
                        {watchUsdtPairUuid && (
                          <p className="text-xs text-gray-500 mt-1">
                            Tasa del par seleccionado
                          </p>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Controller
                          name="usdt_pair_inverse"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="checkbox"
                              checked={field.value ?? false}
                              onChange={field.onChange}
                            />
                          )}
                        />
                        Usar tasa inversa (1/rate)
                      </label>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mr-2"
                    />
                  )}
                />
                <label className="text-sm font-medium text-gray-700">
                  Par activo
                </label>
              </div>
              <div className="flex items-center">
                <Controller
                  name="is_monitored"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mr-2"
                    />
                  )}
                />
                <label className="text-sm font-medium text-gray-700">
                  Monitorear para scraping
                </label>
              </div>
              <div className="flex items-center">
                <Controller
                  name="binance_tracked"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mr-2"
                    />
                  )}
                />
                <label className="text-sm font-medium text-gray-700">
                  Rastreado en Binance P2P
                </label>
              </div>
            </div>

            {/* Campos adicionales para Binance */}
            {watchBinanceTracked && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Métodos de Pago de Binance <span className="text-red-500">*</span>
                  </label>
                  {getFiatCurrencyFromPair(watchFromCurrency, watchToCurrency) ? (
                    <Controller
                      name="banks_to_track"
                      control={control}
                      render={({ field }) => (
                        <TradeMethodSelector
                          selectedMethods={field.value || []}
                          onChange={field.onChange}
                          fiatCurrency={getFiatCurrencyFromPair(watchFromCurrency, watchToCurrency) || ''}
                          className="w-full"
                        />
                      )}
                    />
                  ) : (
                    <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                      <p className="text-sm text-gray-500">
                        Seleccione las monedas de origen y destino primero
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto a Trackear <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="amount_to_track"
                    control={control}
                    rules={{
                      min: { value: 0.01, message: 'El monto debe ser mayor a 0' }
                    }}
                    render={({ field }) => (
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        className={`w-full border rounded-md px-3 py-2 ${errors.amount_to_track ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="0.00"
                      />
                    )}
                  />
                  {errors.amount_to_track && (
                    <p className="text-red-500 text-xs mt-1">{errors.amount_to_track.message}</p>
                  )}
                </div>
              </>
            )}

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={16} />
              {isSubmitting ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
