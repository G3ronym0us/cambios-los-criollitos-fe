import { describe, expect, it } from 'vitest';
import type { PaymentStats } from '@/types/payment';
import { getAttentionCounts } from './attentionCounts';

function stats(needs_attention: number): PaymentStats {
  return {
    table: 'incoming',
    needs_attention,
    unassigned: [],
    unassigned_truncated: false,
    received_today: 0,
    reconciled_today: 0,
  };
}

describe('getAttentionCounts', () => {
  it('reparte el total del ámbito entre por atender y conciliados', () => {
    expect(getAttentionCounts(stats(8), 34)).toEqual({ ATTENTION: 8, RECONCILED: 26, ALL: 34 });
  });

  it('sin franja todavía cargada no inventa cifras', () => {
    expect(getAttentionCounts(null, 34)).toBeNull();
  });

  it('si las dos peticiones se cruzan, no deja "conciliados" en negativo', () => {
    expect(getAttentionCounts(stats(40), 34)).toEqual({ ATTENTION: 34, RECONCILED: 0, ALL: 34 });
  });
});
