/**
 * Las columnas de la cuenta, en UN solo sitio.
 *
 * La pestaña enseña dos listas distintas —la cola de trabajo de «Por entregar» y el hilo
 * de todo lo demás— y cada una vivía con su propia maquetación. Al pasar de un chip a otro
 * la tabla se transformaba: cambiaban las columnas, la alineación y el sitio de las cifras,
 * como si fueran dos pantallas. Son la misma lista filtrada, así que se leen igual.
 *
 * Fecha · Valor · Estado · Acción. A partir de `lg` es rejilla, con cabecera; por debajo la
 * fila envuelve y cada trozo lleva su etiqueta, porque cuatro columnas en un móvil no se
 * leen. Quien cambie un ancho aquí lo cambia en las dos listas a la vez, que es justo lo
 * que hay que garantizar.
 */
export const ACCOUNT_GRID =
  'flex flex-wrap items-center gap-x-3 gap-y-2 ' +
  'lg:grid lg:grid-cols-[2.75rem_minmax(9rem,1fr)_minmax(11rem,1.3fr)_6.5rem_8rem] ' +
  'lg:items-center lg:gap-x-3 lg:gap-y-0';

/** Ancho mínimo de la tabla: por debajo se desplaza en horizontal en vez de descuadrarse. */
export const ACCOUNT_TABLE_MIN = 'lg:min-w-[40rem]';

export const ACCOUNT_COL = {
  /** La casilla. En el hilo no hay nada que marcar, pero la columna se reserva igual. */
  check: 'w-11 shrink-0',
  when: 'min-w-0 flex-1 basis-40 lg:flex-none lg:basis-auto',
  value: 'min-w-0 flex-1 basis-44 lg:flex-none lg:basis-auto',
  state: 'shrink-0 lg:w-auto',
  action: 'shrink-0 lg:justify-end',
};
