import type { FundMovementFilters } from '@/types/fund';

/**
 * Construye el querystring de `GET /funds/groups/{uuid}/movements`.
 *
 * El endpoint tipa `date_from`/`date_to` como `datetime`: un yyyy-mm-dd pelado lo
 * rechaza con 422, por eso se les agrega la hora. `date_to` toma el final del día
 * para que el rango incluya el día seleccionado completo.
 */
export function buildMovementsQuery(filters: FundMovementFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.movement_type) params.append('movement_type', filters.movement_type);
  if (filters.date_from) params.append('date_from', `${filters.date_from}T00:00:00`);
  if (filters.date_to) params.append('date_to', `${filters.date_to}T23:59:59`);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.per_page) params.append('per_page', filters.per_page.toString());
  return params.toString();
}
