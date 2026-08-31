# Transferir un pago a otro cliente — contrato de API

El frontend de esta función ya está construido y llama a los dos endpoints de abajo
(`src/services/paymentService.ts`: `transferClient` y `getTimeline`). **Todavía no existen en el
backend**: hasta que se implementen, la acción responde error y la bitácora se muestra vacía con
un aviso en línea. No hay mocks ni flags — en cuanto el backend responda, la pantalla funciona.

El caso que resuelve: el comprobante entra a nombre de quien lo mandó, pero el dinero es de otro
(el esposo pagó por la esposa, la empresa por el empleado, el bot lo pegó al cliente equivocado).
Hasta ahora la salida era anular y volver a cargar, y se perdía el hilo.

## La regla que gobierna todo

**El pago nunca se duplica ni se anula.** Es el mismo `id` con otro dueño. Los saldos de caja no
se tocan. De ahí se siguen las reglas de bloqueo y el comportamiento con la operación vinculada.

---

## 1. `PATCH /payments/{table}/{payment_id}/client`

`table` ∈ `incoming` | `outgoing`. Hoy el frontend solo lo llama con `incoming` (es el único
lado donde el diseño abrió la puerta), pero el servicio ya está tipado para los dos.

### Request

```json
{
  "client_uuid": "uuid del cliente destino",
  "reason": "THIRD_PARTY | BOT_MISMATCH | DUPLICATE_CLIENT",
  "note": "texto libre o null"
}
```

### Respuesta `200`

El `PaymentData` completo y ya actualizado — el mismo shape que devuelve
`PATCH /payments/{table}/{id}/operation`, incluido el bloque `transfer` nuevo (ver §3).

### Qué tiene que hacer, en una sola transacción

1. Reasignar `client_uuid` (y el `client_name` / `client_phone` derivados) al destino.
2. **Conservar la fecha original del pago.** No se toca `created_at`: los reportes del día no
   se pueden mover hacia atrás por una corrección de titularidad.
3. Si el pago tenía operación: **desvincularla**, dejándola esperando fondos. La operación
   **nunca** se muda de cliente con el pago. Esto no pide `orphan_action` como sí hace
   `linkOperation(null)` — aquí no hay decisión que tomar, y el frontend ya avisa de la
   consecuencia antes de confirmar.
4. Escribir la línea correspondiente en la bitácora (§2), más la del desvinculado automático.
5. Acumular el rastro: si el pago ya se había transferido antes, `transfer.count` sube y
   `transfer.from_client_*` **sigue apuntando al primer origen**, no al anterior.

### Errores

| Código | Cuándo | Qué muestra el front |
|---|---|---|
| `403` | El operador no puede transferir | La fila ya sale deshabilitada; el 403 es la red de seguridad |
| `409` | El pago ya está conciliado / contado | Igual que arriba: la fila ya sale bloqueada |
| `422` | `client_uuid` inexistente, o igual al actual | `toast.error` con el mensaje del backend |

El frontend pinta `error` tal cual en un toast, así que el texto del backend debe estar en
español y ser legible por un operador.

### Bloqueos que el frontend ya aplica

Están en `src/app/admin/payments/_components/paymentTransfer.ts` (`canTransferPayment`), con
tests. **El backend tiene que validarlos igual** — el front solo evita el viaje:

- `operation_status === 'COMPLETED'` — la operación se entregó y se cerró.
- `fund_deposit.status === 'CONFIRMED'` — ya está contado en un fondo, a nombre de un gestor.
- `credited_to_balance > 0.01` — ya se acreditó al saldo del cliente de origen.

Los dos últimos no estaban en el diseño explícitamente; se derivan de «un pago conciliado ya
movió caja» y se marcaron como decisión a revisar. Si el backend prefiere permitirlos
(revirtiendo el depósito o el abono), quitar la condición de ese archivo es un cambio de dos
líneas y los tests dicen exactamente qué se está aflojando.

### Búsqueda

El origen debe **seguir indexado** después de la transferencia: buscar «Yeimar» en la bandeja
tiene que seguir encontrando el pago aunque ahora sea de Marielys, para que nadie lo dé por
perdido. La fila la manda el destino; el origen solo tiene que ser encontrable.

---

## 2. `GET /payments/{table}/{payment_id}/timeline`

### Respuesta `200`

```json
{
  "items": [
    {
      "uuid": "…",
      "kind": "TRANSFER",
      "title": "Transferido a otro cliente",
      "detail": "Yeimar A. Rondón → Marielys C. Rondón. Motivo: pagó un tercero — «El esposo mandó el Zelle, la operación es de ella.»",
      "actor": "andres",
      "at": "2026-08-31T15:07:00Z"
    }
  ]
}
```

- Orden: **de lo más reciente a lo más viejo**.
- `kind` ∈ `TRANSFER` `LINK` `UNLINK` `CORRECTION` `DEPOSIT` `BALANCE` `OTHER`. Solo elige el
  color del punto; un `kind` desconocido se pinta en gris sin romper nada.
- `title` y `detail` los **redacta el backend**, ya en español y listos para pintar. Es
  deliberado: así una clase de evento nueva aparece en la bitácora sin tocar el frontend.
- `actor: null` = automático (lo pinta como «Automático»).

La bitácora va plegada en el cajón y solo se pide al abrirla, así que este endpoint no se llama
en el camino normal — no necesita ser especialmente rápido.

---

## 3. Campo nuevo en `PaymentData`

Lo devuelven **el listado y el detalle**, porque la insignia «Transferido» de la bandeja y el
chip permanente de la cabecera lo necesitan siempre (`src/types/payment.ts`):

```ts
transfer?: {
  from_client_uuid: string | null;   // el PRIMER origen, no el anterior
  from_client_name: string | null;
  from_client_phone: string | null;
  reason: 'THIRD_PARTY' | 'BOT_MISMATCH' | 'DUPLICATE_CLIENT' | null;
  note: string | null;
  transferred_at: string | null;
  transferred_by: string | null;     // username del operador
  count: number;                     // cuántas transferencias acumula; 1 en el caso normal
} | null;
```

`transfer === null` (o ausente) = pago normal: no sale ni la insignia ni el chip.

---

## 4. Permiso

El diseño lo llamó `pagos.transferir`. La app no tiene permisos finos, así que el frontend lo
resuelve con el rol: **solo `ROOT`** (`canTransferPayments`). `MODERATOR` ya entra a todo
`/admin`, así que colgarlo de ahí sería no gatearlo.

Si el backend expone permisos de verdad más adelante, `canTransferPayments` en
`paymentTransfer.ts` es el único sitio del frontend que hay que tocar.
