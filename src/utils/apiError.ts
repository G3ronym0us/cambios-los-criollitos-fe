/**
 * Normaliza el cuerpo de error de la API a un string legible.
 *
 * El backend (FastAPI) puede devolver `detail` como:
 * - string: un mensaje propio (p. ej. reglas de negocio).
 * - array de objetos `{ msg, loc, ... }`: errores de validación 422.
 * - objeto `{ msg }`: caso puntual.
 *
 * Nunca debe filtrarse un objeto a la UI: `toast`/React no renderizan objetos y
 * lanzan «Objects are not valid as a React child». Esta función garantiza un string.
 */
export function normalizeErrorDetail(
  errorData: unknown,
  fallback = 'Error del servidor',
): string {
  if (!errorData || typeof errorData !== 'object') return fallback;

  const data = errorData as { detail?: unknown; message?: unknown };
  const { detail } = data;

  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (typeof d === 'string' ? d : (d as { msg?: string })?.msg))
      .filter((m): m is string => !!m);
    if (msgs.length) return msgs.join('; ');
  }

  if (detail && typeof detail === 'object') {
    const msg = (detail as { msg?: string }).msg;
    if (msg) return msg;
  }

  if (typeof data.message === 'string' && data.message.trim()) return data.message;

  return fallback;
}
