import { describe, expect, it } from 'vitest';
import {
  bareDuration,
  formatDailyAverage,
  formatDeviation,
  formatMoney,
  formatUnassigned,
  isFullyReconciled,
  liveAgo,
  staleLabel,
  timeSince,
  timeUntil,
  topShareOfTotal,
  waitingDaysLabel,
} from './overviewFormat';

describe('formatMoney', () => {
  it('dos decimales fijos con coma, como el resto del panel', () => {
    expect(formatMoney(1240, 'USD')).toBe('1.240,00 USD');
    expect(formatMoney(84.2, 'USDT')).toBe('84,20 USDT');
  });

  it('sin moneda, solo el número', () => {
    expect(formatMoney(0, null)).toBe('0,00');
  });
});

describe('formatUnassigned', () => {
  it('dice "o más" cuando el agregado viene recortado', () => {
    expect(formatUnassigned(1240, 'USD', true)).toBe('1.240,00 USD o más sin asignar');
  });

  it('exacto cuando no hubo recorte', () => {
    expect(formatUnassigned(1240, 'USD', false)).toBe('1.240,00 USD sin asignar');
  });
});

describe('timeUntil / timeSince', () => {
  const now = new Date('2026-09-02T12:00:00Z').getTime();

  it('cuenta lo que le queda a una cotización', () => {
    expect(timeUntil('2026-09-02T12:41:00Z', now)).toBe('en 41 min');
    expect(timeUntil('2026-09-02T11:00:00Z', now)).toBe('vencida');
    expect(timeUntil(null, now)).toBeNull();
  });

  it('cuenta la antigüedad de la más vieja', () => {
    expect(timeSince('2026-08-31T12:00:00Z', now)).toBe('hace 2 días');
    expect(timeSince('2026-09-02T11:50:00Z', now)).toBe('hace 10 min');
  });
});

describe('bareDuration', () => {
  const now = new Date('2026-09-02T12:00:00Z').getTime();

  it('sin "hace" — para frases que ya traen su propio verbo', () => {
    expect(bareDuration('2026-08-31T12:00:00Z', now)).toBe('2 días');
    expect(bareDuration('2026-09-02T11:59:00Z', now)).toBe('1 min');
    expect(bareDuration(null, now)).toBeNull();
  });
});

describe('waitingDaysLabel', () => {
  it('compacto para la lista de pendientes', () => {
    expect(waitingDaysLabel(0)).toBe('hoy');
    expect(waitingDaysLabel(1)).toBe('ayer');
    expect(waitingDaysLabel(3)).toBe('3 d');
  });
});

describe('staleLabel', () => {
  it('marca una lectura vieja', () => {
    expect(staleLabel(9)).toBe('sin lectura desde hace 9 h');
    expect(staleLabel(null)).toBeNull();
  });
});

describe('formatDeviation', () => {
  it('signo explícito en la desviación', () => {
    expect(formatDeviation(3.6)).toBe('+3,6 %');
    expect(formatDeviation(-1.1)).toBe('-1,1 %');
  });
});

describe('formatDailyAverage', () => {
  it('un decimal', () => {
    expect(formatDailyAverage(5.4)).toBe('5,4');
  });
});

describe('topShareOfTotal', () => {
  it('el porcentaje que representan los mayores', () => {
    expect(topShareOfTotal([620, 410, 380], 1980)).toBe(71);
  });

  it('null sin total contra qué dividir', () => {
    expect(topShareOfTotal([1], 0)).toBeNull();
  });
});

describe('isFullyReconciled', () => {
  it('todo en cero es la buena noticia', () => {
    expect(
      isFullyReconciled({ needsAttention: 0, toSettle: 0, toDeliver: 0, expiring: 0 })
    ).toBe(true);
  });

  it('cualquier cifra viva rompe el "todo conciliado"', () => {
    expect(
      isFullyReconciled({ needsAttention: 0, toSettle: 0, toDeliver: 0, expiring: 2 })
    ).toBe(false);
  });
});

describe('liveAgo', () => {
  it('segundos redondeados desde generated_at', () => {
    const now = new Date('2026-09-02T12:00:40Z').getTime();
    expect(liveAgo('2026-09-02T12:00:00Z', now)).toBe('hace 40 s');
  });

  it('sin dato, un guion', () => {
    expect(liveAgo(null)).toBe('—');
  });
});
