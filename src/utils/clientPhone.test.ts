import { describe, expect, it } from 'vitest';
import { isEntityClientPhone, isUnassignedClientPhone } from './functions';

describe('isEntityClientPhone', () => {
  it('reconoce a un cliente-entidad', () => {
    expect(isEntityClientPhone('entity:bodegon-x')).toBe(true);
  });

  it('no confunde a una entidad con un anónimo', () => {
    expect(isUnassignedClientPhone('entity:bodegon-x')).toBe(false);
    expect(isEntityClientPhone('anon:group:1')).toBe(false);
    expect(isEntityClientPhone('584121234567')).toBe(false);
    expect(isEntityClientPhone(null)).toBe(false);
  });
});
