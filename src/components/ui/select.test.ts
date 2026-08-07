import { createElement, Fragment, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { collectOptions, SelectContent, SelectGroup, SelectItem } from './select';

/**
 * Base UI hace que `<Select.Value>` pinte el valor crudo, no el texto del item:
 * un `<SelectItem value={uuid}>` mostraba el UUID en el trigger. `collectOptions`
 * arma el mapa value → label que se le pasa como `items` al Root.
 */
function optionsOf(children: ReactNode) {
  const out: { value: unknown; label: ReactNode }[] = [];
  collectOptions(children, out);
  return out;
}

describe('collectOptions', () => {
  it('mapea el uuid del item a su nombre visible', () => {
    const children = createElement(
      SelectContent,
      null,
      createElement(SelectItem, { key: 'a', value: 'a1b2-uuid' }, 'Bolívar (VES)'),
      createElement(SelectItem, { key: 'b', value: 'c3d4-uuid' }, 'Peso colombiano (COP)')
    );

    expect(optionsOf(children)).toEqual([
      { value: 'a1b2-uuid', label: 'Bolívar (VES)' },
      { value: 'c3d4-uuid', label: 'Peso colombiano (COP)' },
    ]);
  });

  it('encuentra los items dentro de arrays de un map', () => {
    const currencies = [
      { uuid: 'u1', name: 'Bolívar' },
      { uuid: 'u2', name: 'Real' },
    ];
    const children = createElement(
      SelectContent,
      null,
      createElement(SelectItem, { key: 'all', value: '__all__' }, 'Todas las monedas'),
      currencies.map((c) => createElement(SelectItem, { key: c.uuid, value: c.uuid }, c.name))
    );

    expect(optionsOf(children).map((o) => o.value)).toEqual(['__all__', 'u1', 'u2']);
  });

  it('atraviesa fragmentos y grupos', () => {
    const children = createElement(
      SelectContent,
      null,
      createElement(
        Fragment,
        null,
        createElement(
          SelectGroup,
          null,
          createElement(SelectItem, { key: 'x', value: 'uuid-x' }, 'Anidado')
        )
      )
    );

    expect(optionsOf(children)).toEqual([{ value: 'uuid-x', label: 'Anidado' }]);
  });

  it('no devuelve nada cuando no hay items que mapear', () => {
    expect(optionsOf(createElement(SelectContent, null))).toEqual([]);
  });
});
