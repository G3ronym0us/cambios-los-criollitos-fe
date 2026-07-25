import { describe, expect, it } from 'vitest';
import { normalizeErrorDetail } from './apiError';

describe('normalizeErrorDetail', () => {
  it('devuelve un `detail` string tal cual', () => {
    expect(normalizeErrorDetail({ detail: 'No autorizado' })).toBe('No autorizado');
  });

  it('une los `msg` de un array de validación 422 de FastAPI', () => {
    const body = {
      detail: [
        { loc: ['query', 'date_from'], msg: 'Input should be a valid datetime', type: 'datetime' },
        { loc: ['query', 'date_to'], msg: 'Otro problema', type: 'x' },
      ],
    };
    expect(normalizeErrorDetail(body)).toBe('Input should be a valid datetime; Otro problema');
  });

  it('soporta un array de strings', () => {
    expect(normalizeErrorDetail({ detail: ['a', 'b'] })).toBe('a; b');
  });

  it('extrae `msg` de un detail objeto', () => {
    expect(normalizeErrorDetail({ detail: { msg: 'algo' } })).toBe('algo');
  });

  it('cae a `message` cuando no hay detail utilizable', () => {
    expect(normalizeErrorDetail({ message: 'mensaje suelto' })).toBe('mensaje suelto');
  });

  it('usa el fallback ante cuerpos vacíos, no-objeto o detail inservible', () => {
    expect(normalizeErrorDetail(null)).toBe('Error del servidor');
    expect(normalizeErrorDetail('texto')).toBe('Error del servidor');
    expect(normalizeErrorDetail({ detail: [] })).toBe('Error del servidor');
    expect(normalizeErrorDetail({ detail: 42 }, 'boom')).toBe('boom');
  });

  it('nunca devuelve un objeto (garantía anti-crash de React/toast)', () => {
    expect(typeof normalizeErrorDetail({ detail: [{ msg: 'x' }] })).toBe('string');
    expect(typeof normalizeErrorDetail({ detail: { loc: [] } })).toBe('string');
  });
});
