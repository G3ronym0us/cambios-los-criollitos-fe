import type {
  Control,
  FieldErrors,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import { CreateCurrencyPairData, CurrencyPairData, PairType } from '@/types/admin';

export type CurrencyPairFormData = CreateCurrencyPairData;

/** Valor centinela para los `Select` que representan "sin configurar" (Radix no acepta value=""). */
export const NONE = '__none__';

export const defaultValues: CurrencyPairFormData = {
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
  rounding_mode: null,
  rounding_step: null,
  rounding_direction: null,
  rounding_amount_side: null,
};

/** El backend serializa los Numeric como string ("3000.0"); los inputs quieren number. */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildEditDefaults(pair: CurrencyPairData): CurrencyPairFormData {
  const normalizedPairType = (pair.pair_type as string).toUpperCase() as PairType;
  return {
    from_currency_uuid: pair.from_currency_uuid,
    to_currency_uuid: pair.to_currency_uuid,
    base_pair_uuid: pair.base_pair_uuid,
    derived_percentage: toNumber(pair.derived_percentage),
    use_inverse_percentage: pair.use_inverse_percentage,
    description: pair.description,
    is_active: pair.is_active,
    is_monitored: pair.is_monitored,
    binance_tracked: pair.binance_tracked,
    banks_to_track: pair.banks_to_track || [],
    amount_to_track: toNumber(pair.amount_to_track),
    pair_type: normalizedPairType,
    usdt_reference_side: pair.usdt_reference_side ?? null,
    usdt_manual_rate: toNumber(pair.usdt_manual_rate),
    usdt_pair_uuid: pair.usdt_pair_uuid ?? null,
    usdt_pair_inverse: pair.usdt_pair_inverse ?? false,
    rounding_mode: pair.rounding_mode ?? null,
    rounding_step: toNumber(pair.rounding_step),
    rounding_direction: pair.rounding_direction ?? null,
    rounding_amount_side: pair.rounding_amount_side ?? null,
  };
}

/** Props que toda sección recibe del formulario padre (react-hook-form). */
export interface SectionProps {
  control: Control<CurrencyPairFormData>;
  watch: UseFormWatch<CurrencyPairFormData>;
  setValue: UseFormSetValue<CurrencyPairFormData>;
  errors: FieldErrors<CurrencyPairFormData>;
}
