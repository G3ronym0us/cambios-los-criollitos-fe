# Lo que le debemos al cliente («por entregar») — contrato de API

**Pendiente en el backend.** A diferencia de `payment-transfer.md`, esto no describe algo que ya
existe: es lo que el frontend necesita y todavía no tiene. La pantalla está construida y funciona
sin ello —con los apaños que se detallan abajo y sus límites reales—, así que esto es la lista de
lo que hay que implementar para que deje de ser un apaño.

El frontend lo consume desde `src/app/admin/clients/_lib/pending.ts` (la lectura) y
`_lib/pendingDelivery.ts` (la escritura). Esos dos archivos son los únicos que hay que tocar.

## De qué estamos hablando

«Por entregar» es la plata que le debemos al cliente: el trozo del valor de una operación que
ningún comprobante de salida cubre todavía, o sea `operations.pending_amount > 0`. Es exactamente
la misma bandeja que el listado de Operaciones llama **«por cuadrar»** (`needs=settle`), leída
desde el lado del cliente en vez del lado de la operación.

> **Cuidado con el nombre.** La tarjeta «por entregar» del listado de Operaciones es OTRA cosa:
> `delivery_status`, el efectivo que falta mover en mano. Son dos conceptos y hoy comparten
> etiqueta en dos pantallas distintas. Vale la pena renombrar uno de los dos.

**La moneda importa.** `pending_amount` va en la moneda del VALOR del trato (`operations.currency`,
lo que entrega el cliente: los USD de un USD/VES), no en la moneda con la que se le paga. Todo lo
que este contrato agrega o filtra va en esa moneda. El equivalente en moneda de pago es derivado
—sale de la proporción del propio trato— y se muestra con «≈»; no se suma ni se ordena por él.

---

## 1. `GET /clients` — deuda por cliente

### Campo nuevo en cada `ClientData`

```json
"pending_by_pair": [
  {
    "pair_symbol": "USD/VES",
    "currency": "USD",
    "amount": 1513.33,
    "operations": 5,
    "oldest_at": "2026-08-25T12:00:00Z",
    "payout_currency": "VES",
    "payout_amount": 431905.60
  }
]
```

Una entrada por par con deuda; lista vacía —no `null`— cuando el cliente no debe nada. Agrupar por
par y no dar un total único es deliberado: USD, VES y USDT no se suman sin inventarse una tasa.

`payout_amount` es el equivalente en la moneda de pago a la tasa del propio trato. Si alguna
operación del grupo no permite calcularlo, el campo del grupo entero va `null` — media suma es peor
que ninguna.

`oldest_at` debe ser la fecha del **comprobante entrante**, no la de la operación. Ver §3.

### Parámetros nuevos

| Parámetro | Tipo | Qué hace |
|---|---|---|
| `has_pending` | bool | Sólo los clientes con `pending_by_pair` no vacío |
| `pair` | string | Acota `has_pending` **y** `pending_by_pair` a ese par |

`pair` recorta lo que se ve del cliente, no sólo qué clientes salen: con `pair=USD/VES`, un cliente
que además debe en VES/COP devuelve sólo la entrada de USD/VES.

### Por qué hace falta

Hoy el frontend pide las operaciones sin cubrir (`GET /operations?needs=settle&limit=500`) y las
agrupa por `client_uuid` en memoria. Pasado ese techo **los totales mienten**: no se quedan cortos
de forma visible, dicen un número menor como si fuera el bueno. La pantalla avisa cuando lo toca
(`total > operations.length`), pero es un aviso, no una solución. Ordenar por monto tiene el mismo
problema, porque ordena sobre lo que cupo.

---

## 2. Marcar entregado — el endpoint que falta

El diseño pide tres cosas que hoy no existen: marcar un lote de operaciones de una vez, repartir un
monto entre ellas, y deshacer con rastro.

### Lo que hace el frontend mientras tanto

Reutiliza `PUT /operations/{uuid}/coverage`, que es el mecanismo del panel de cobertura: entregar
sin comprobante es declarar el hueco como cubierto en efectivo.

```json
{
  "payments": [{ "payment_id": 1234 }],
  "uncovered": { "amount": 142700.00, "reason": "CASH" },
  "partial": true
}
```

`payments` repite los comprobantes que ya cubrían la operación (se leen antes con
`GET /operations/{uuid}/coverage`) para no borrarlos; `partial` sólo va cuando se entregó menos
de lo que faltaba.

**`uncovered.amount` es el hueco ENTERO, no lo que se entrega ahora.** El endpoint recibe el
estado de cobertura completo, no un delta — así lo usa el panel de cobertura. Una segunda entrega
parcial tiene que mandar `uncovered_previo + entregado`; mandar sólo lo nuevo lo *reemplaza* y la
entrega anterior desaparece sin dejar rastro. Por lo mismo, deshacer no borra `uncovered`: repone
el valor que tenía antes de esa entrega, que puede no ser cero.

**Verificado contra `set_operation_coverage`** (`app/services/whatsapp_payment_service.py`), que es
donde vive la regla:

- `payments: []` funciona: el bucle no se ejecuta y la derivación de tasa se salta por `if rows`.
- `uncovered` y `partial: true` conviven: `partial` sólo controla si se deriva la tasa; el hueco se
  aplica aparte.
- **`uncovered` hay que mandarlo siempre, incluso en cero.** El backend sólo lo toca si el campo
  llega (`if uncovered is not None`); omitirlo deja el hueco como estaba, así que un deshacer sin
  ese campo no deshace nada. Con `amount: 0` la validación del motivo se salta y el hueco se borra
  (`op.uncovered_amount = resto or None`).

Lo que se paga por hacerlo así:

- **Una petición por operación**, más su lectura previa. Un lote de cinco son diez viajes.
- **No es atómico.** Si la tercera falla, las dos primeras ya están marcadas. El frontend informa de
  cuáles pasaron y cuáles no en vez de un «listo».
- **El rastro es el del cuadre, no el de una entrega.** Queda quién movió la cobertura, no una
  bitácora de entregas.
- **Deshacer sólo dura la sesión.** Antes de tocar nada se guarda la cobertura previa y deshacer la
  vuelve a poner; al recargar la página esa memoria se pierde y ya sólo se deshace operación por
  operación desde su panel de cobertura.

### Lo que debería existir

```
POST /clients/{uuid}/pending/deliver
```

```json
{
  "operations": [
    { "operation_uuid": "…", "amount": 142700.00 },
    { "operation_uuid": "…", "amount": 21680.00 }
  ],
  "note": "texto libre o null"
}
```

Requisitos, en orden de importancia:

1. **Una sola transacción.** O se marcan todas o no se marca ninguna.
2. **Rastro propio**: quién marcó, cuándo, cuánto y sobre qué operación. Es lo que hace posible
   deshacer más tarde y auditar después.
3. **Rechazar lo que no se puede entregar**: una operación sin beneficiario resuelto no se marca —
   el frontend ya las excluye de «seleccionar todas», pero la regla tiene que vivir en el servidor.
4. `amount` opcional: sin él, se entrega todo lo que falte de esa operación.

```
POST /clients/{uuid}/pending/deliver/{batch_uuid}/undo
```

Devuelve las operaciones del lote a pendiente **sin borrar el rastro** — deshacer no es borrar:
queda quién marcó, quién deshizo y cuándo. Sin límite de tiempo: si el error se descubre mañana, se
deshace mañana.

### El reparto no necesita endpoint

Repartir un monto de la más vieja a la más nueva es aritmética sobre lo que ya está en pantalla
(`src/app/admin/clients/_lib/distribute.ts`, con sus tests). El operador ve el reparto entero antes
de confirmar y puede desmarcar filas para que se re-reparta. Al confirmar, es el mismo `deliver` de
arriba con un `amount` por operación.

Lo que sí queda fuera: si sobra dinero sin asignar, **no** se convierte en saldo a favor solo. Eso
es `POST /clients/{uuid}/balance` (`CREDIT`), una decisión aparte y explícita.

Y el reparto sólo se ofrece dentro de una moneda: un monto entregado está en una, y repartirlo
entre operaciones en monedas distintas sería restar bolívares de una deuda en dólares. Con varias
monedas a la vista la pantalla pide elegir un par antes de dejar repartir.

---

## 3. La fecha del pago en la operación — lo que arregla el orden

```
GET /operations  →  "first_incoming_payment_at": "2026-08-24T14:02:00Z"
```

Un campo por operación con la fecha de su primer comprobante entrante (`null` si no tiene).

### Por qué

Cuando el bot no reconoce un comprobante, el operador crea la operación a mano desde el pago
(`POST /payments/{table}/{id}/create-operation`), y ese endpoint no lleva fecha: la operación nace
con `created_at` de hoy aunque el dinero llegara la semana pasada. Ordenar por la operación manda
esas al final de la cola justo cuando son las más viejas.

No es sólo un orden feo. El reparto de un monto va **de la más vieja a la más nueva**, así que un
orden equivocado aplica el dinero a la operación equivocada, y «la más vieja lleva N esperando»
miente en el sentido que más importa: hacia abajo.

### Qué hace el frontend mientras tanto

En el **perfil del cliente** lo resuelve: pide `GET /operations/{uuid}/payments` por cada operación
sin cubrir y se queda con el entrante más antiguo (`src/app/admin/clients/_lib/paymentDates.ts`).
Son pocas operaciones y son de un solo cliente, así que el coste está acotado. De ahí salen el
orden, la antigüedad de cada fila y el orden del reparto.

En el **listado de clientes** no se puede: serían cientos de peticiones. Ahí `oldest_at` sigue
saliendo de la fecha de la operación, así que el orden por antigüedad y el «la más vieja lleva N»
de la franja se quedan cortos precisamente para las operaciones creadas a mano. Es la razón
principal para implementar este campo: con él, la agregación del §1 sale bien de una vez y el
frontend deja de pedir pagos uno por uno.

### El límite que ni esto arregla

`payments.created_at` es cuándo se **registró** el comprobante, no la fecha impresa en él. Si el
comprobante se sube tarde, la fecha sigue siendo tardía. Arreglarlo del todo pide una fecha del
comprobante (la que lee el OCR) en `PaymentData`, que hoy no existe.
