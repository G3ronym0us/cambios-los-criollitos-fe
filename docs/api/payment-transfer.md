# Transferir un pago a otro cliente — contrato de API

**Implementado** en `cambios-los-criollitos-be`, rama `feat/payment-transfer-client`
(`PATCH /payments/{table}/{id}/client` y `GET /payments/{table}/{id}/timeline`). Este documento
se queda como la descripción del contrato que une los dos lados: lo de abajo es lo que el
backend hace, no lo que debería hacer.

El frontend lo consume desde `src/services/paymentService.ts` (`transferClient`, `getTimeline`).

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

### Cómo está implementado el cambio de dueño

Los pagos **no tienen FK de cliente**: el cliente sale de `client_phone` con un join contra
`whatsapp_clients`. Así que transferir no podía ser «cambiar el cliente», y reescribir el
teléfono habría borrado lo que el OCR leyó.

La solución es una columna nueva, `owner_client_id`, en las dos tablas de pagos: un **override**
del dueño. `client_phone` no se toca nunca. De ahí salen tres propiedades de golpe:

- El pago conserva su identidad — mismo `id`, misma fecha, mismo comprobante.
- El origen **sigue indexado**: buscar por el nombre del que mandó el dinero lo encuentra igual,
  porque su join sigue en pie. El listado busca por los dos nombres, origen y destino.
- Revertir una transferencia es poner la columna a NULL.

### Qué tiene que hacer, en una sola transacción

1. Poner `owner_client_id` al destino. **`client_phone` no se toca** (ver arriba).
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
| `404` | `client_uuid` no existe | `toast.error` con el mensaje del backend |
| `422` | El destino ya es el dueño, o el motivo no es uno de los tres | `toast.error` |

El frontend pinta `error` tal cual en un toast, así que el texto del backend debe estar en
español y ser legible por un operador.

### Bloqueos que el frontend ya aplica

Están en `src/app/admin/payments/_components/paymentTransfer.ts` (`canTransferPayment`), y el
backend los valida igual en `_assert_transferable` — el front solo evita el viaje. Los dos lados
tienen tests:

- `operation_status === 'COMPLETED'` — la operación se entregó y se cerró.
- `fund_deposit.status === 'CONFIRMED'` — ya está contado en un fondo, a nombre de un gestor.
- `credited_to_balance > 0.01` — ya se acreditó al saldo del cliente de origen.

Los dos últimos no estaban en el diseño explícitamente: se derivan de «un pago conciliado ya
movió caja». Si se decide permitirlos (revirtiendo el depósito o el abono), hay que quitar la
condición **en los dos sitios**, y los tests de cada lado dicen exactamente qué se afloja.

### Búsqueda

El origen **sigue indexado** después de la transferencia: buscar «Yeimar» en la bandeja
encuentra el pago aunque ahora sea de Marielys, para que nadie lo dé por perdido. La fila la
manda el destino; el origen solo tiene que ser encontrable. Sale gratis: `client_phone` sigue
donde estaba, así que su join no se rompe. El listado busca por los dos nombres.

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

**Limitación conocida:** solo las transferencias son historia de verdad (una fila por salto en
`whatsapp_payment_transfers`). El resto de las líneas se **derivan del estado actual** — hay una
de corrección si `corrected_at` está puesto, una de vínculo si hoy tiene operación, una de
depósito o de saldo si acabó ahí. O sea: se ve QUÉ pasó, no cuántas veces ni en qué orden se
deshizo. El pago no lleva un log de auditoría general; cuando exista, se sustituye por dentro sin
tocar el frontend, que ya recibe `title` y `detail` redactados.

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
