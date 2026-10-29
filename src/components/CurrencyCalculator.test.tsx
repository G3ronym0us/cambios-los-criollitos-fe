// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CurrencyCalculator from './CurrencyCalculator';
import { ratesService } from '@/services/ratesService';
import type { ExchangeRateResponse } from '@/types/currency';

vi.mock('@/services/ratesService', () => ({ ratesService: { getHistoricalRate: vi.fn() } }));
vi.mock('@/services/adminService', () => ({ adminService: { updatePairPercentage: vi.fn() } }));
vi.mock('@/services/bcvService', () => {
  const service = { getBCVRate: async () => ({ rate: 30, lastUpdated: '' }), getEuroRate: async () => null };
  return { default: { getInstance: () => service } };
});
const rates = [{
  currency_pair_uuid: 'pair-a', from_currency: 'ZELLE', to_currency: 'VES',
  rate: 50, base_rate: 50, percentage: 0, inverse_percentage: false,
  created_at: '2026-01-01T00:00:00Z',
}, {
  currency_pair_uuid: 'pair-b', from_currency: 'VES', to_currency: 'ZELLE',
  rate: 0.02, percentage: 0, inverse_percentage: false,
}] as ExchangeRateResponse[];
const historic = { ...rates[0], rate: 40, created_at: '2025-06-10T10:00:00Z' };
const request = vi.mocked(ratesService.getHistoricalRate);
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const changeDate = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Consultar tasa histórica' }));
  fireEvent.change(screen.getByLabelText('Fecha y hora'), { target: { value: '2025-06-10T14:30' } });
};
const amount = (container: HTMLElement, side: string) => container.querySelector<HTMLInputElement>(`#amount-${side}`)!;

describe('pantalla de la calculadora histórica', () => {
  it('mantiene el formulario recogido hasta que el administrador elige consultar el histórico', async () => {
    await act(async () => { render(<CurrencyCalculator rates={rates} user={{ role: 'ROOT' }} />); });
    expect(screen.queryByLabelText('Fecha y hora')).toBeNull();
    expect(screen.getByRole('button', { name: 'Consultar tasa histórica' }).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Consultar tasa histórica' }));
    expect(screen.getByLabelText('Fecha y hora')).toBeTruthy();
  });
  it.each([null, { role: 'USER' }])('oculta la consulta para visitantes y usuarios: %s', async user => {
    await act(async () => { render(<CurrencyCalculator rates={rates} user={user} />); });
    expect(screen.queryByLabelText('Fecha y hora')).toBeNull();
  });

  it.each(['ROOT', 'MODERATOR'])('permite consultar al rol %s y conserva el monto al volver a actual', async role => {
    request.mockResolvedValue({ success: true, data: historic });
    const { container } = render(<CurrencyCalculator rates={rates} user={{ role }} />);
    fireEvent.change(amount(container, 'from'), { target: { value: '100' } });
    changeDate();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar tasa histórica' }));
    await waitFor(() => expect(amount(container, 'to')?.value).toBe('4000'));
    expect(amount(container, 'from').value).toBe('100');
    expect(screen.queryByText('Porcentaje de ganancia')).toBeNull();
    expect(screen.queryByLabelText('Equivalente en $BCV')).toBeNull();
    expect(screen.getByText(/Tasa registrada el/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a tasa actual' }));
    await waitFor(() => expect(amount(container, 'to')?.value).toBe('5000'));
    expect(screen.getByText('Porcentaje de ganancia')).toBeTruthy();
  });

  it('conserva el monto a recibir cuando fue el último editado', async () => {
    request.mockResolvedValue({ success: true, data: historic });
    const { container } = render(<CurrencyCalculator rates={rates} user={{ role: 'ROOT' }} />);
    fireEvent.change(amount(container, 'to'), { target: { value: '4000' } });
    changeDate();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar tasa histórica' }));
    await waitFor(() => expect(amount(container, 'from')?.value).toBe('100'));
    expect(amount(container, 'to').value).toBe('4000');
  });

  it('sin historial no muestra ni permite compartir la cotización actual', async () => {
    request.mockResolvedValue({ success: false, error: 'No hay historial para esta fecha' });
    const { container } = render(<CurrencyCalculator rates={rates} user={{ role: 'ROOT' }} />);
    changeDate();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar tasa histórica' }));
    await screen.findByText('No hay historial para esta fecha');
    expect(amount(container, 'to')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Compartir' })).toBeNull();
    expect(screen.queryByText('Porcentaje de ganancia')).toBeNull();
  });

  it('al intercambiar monedas consulta el historial del nuevo par para el mismo instante', async () => {
    request.mockResolvedValueOnce({ success: true, data: historic });
    request.mockResolvedValueOnce({ success: true, data: { ...rates[1], rate: 0.025, created_at: historic.created_at } });
    const { container } = render(<CurrencyCalculator rates={rates} user={{ role: 'ROOT' }} />);
    changeDate();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar tasa histórica' }));
    await waitFor(() => expect(amount(container, 'to')?.value).toBe('40'));
    fireEvent.click(screen.getByRole('button', { name: 'Intercambiar monedas' }));
    await waitFor(() => expect(request).toHaveBeenLastCalledWith('pair-b', new Date('2025-06-10T14:30').toISOString()));
    await waitFor(() => expect(amount(container, 'to')?.value).toBe('0.03'));
  });
});
