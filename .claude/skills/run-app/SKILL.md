---
name: run-app
description: Levanta Cambios Los Criollitos de verdad —Postgres, la API FastAPI del repo cambios-los-criollitos-be y el Next.js de este repo— con datos de demo, y saca capturas de cualquier pantalla del admin ya autenticado. Úsalo siempre que haya que ver, probar, arrancar o capturar la app, o comprobar que un cambio de UI se ve bien en el navegador y no sólo que compila; también cuando el usuario diga que algo "se ve raro", "sigue igual" o "tiene el diseño viejo", porque abrir la pantalla es la única manera de resolver eso. En un contenedor nuevo hace falta este skill: montar la pila a mano tiene media docena de trampas que cuestan una hora larga.
---

# Levantar la app y verla

Compilar no prueba nada sobre lo que ve el operador. Esta pantalla ya se dio por
buena una vez porque `npm run build` pasaba, y resultó que llevaba semanas con la
presentación vieja. Si el cambio toca la interfaz, ábrela.

## Lo mínimo

```bash
S=.claude/skills/run-app/scripts
bash $S/stack.sh up          # postgres + api + next, idempotente
python3 $S/seed.py           # clientes y deudas de demo
node $S/shot.js /admin/clients
```

`shot.js` deja `/tmp/shot-desktop.png` y `/tmp/shot-mobile.png`. **Míralas.** Una
captura en blanco o un estado vacío es un fallo de arranque, no un diseño sobrio.

Al terminar: `bash $S/stack.sh down` (para API y web; Postgres se queda porque
recrearlo es lo caro). Para volver a la base limpia, `stack.sh reset`.

## Los dos repos

La app son dos repositorios hermanos:

```
cambios-los-criollitos-fe/   este (Next.js 15, App Router)
cambios-los-criollitos-be/   la API (FastAPI + SQLAlchemy + Alembic)
```

Los scripts asumen que están al lado. Si no, exporta `BE_DIR` apuntando al
backend. **El front no sirve de nada solo**: cada pantalla del admin sale de la
API, así que no hay atajo que evite levantar las dos cosas.

## Trampas que ya costaron caro

Están resueltas en los scripts; esto es para cuando algo se salga del guion.

**Postgres no arranca como root.** `initdb` se niega. Los scripts crean un
usuario sin privilegios y hacen todo vía `su`. El servidor escucha sólo por
socket unix en `/tmp/pgsock:5599` — sin TCP, para no chocar con otro Postgres.

**`reset` no borra si la API está viva.** `DROP DATABASE` falla con una sola
conexión abierta, y falla en silencio: el sembrado siguiente se apila sobre el
anterior y aparecen operaciones duplicadas que no explica nadie. El script echa
las conexiones antes de soltar la base y aborta con un mensaje si aun así no
puede.

**Postgres se muere entre sesiones.** El contenedor recicla procesos pero
`/tmp/pgdata` sobrevive. Volver a lanzar `stack.sh up` lo relevanta sin perder
datos; por eso el script es idempotente en vez de fallar si algo ya está vivo.

**`pip install -r requirements.txt` falla y deja el entorno roto.** `http-ece`
no compila acá, y `pywebpush` depende de él. Instalar todo y que reviente a la
mitad deja paquetes a medias, y el síntoma que aparece después no tiene nada que
ver: una `PanicException` de pyo3 al importar `cryptography` desde `jose`. Los
scripts filtran los dos paquetes desde el principio y dejan un stub de
`pywebpush`, porque el código lo importa aunque no se usen las notificaciones.

**Las migraciones ya siembran monedas y pares.** Con símbolos separados por
GUION (`USDT-VES`, `ZELLE-VES`, `VES-COP`) y sin USD. Crear un par que ya existe
revienta contra `unique_currency_pair`, así que el sembrado los reutiliza.

**El login pide `username_or_email`, no `email`.** Con `email` la API devuelve un
422 que parece un problema de credenciales y no lo es.

**La autenticación es una cookie, no una cabecera.** El middleware sólo mira que
exista `access_token`. `shot.js` pide el token a la API y lo planta en el
navegador; así las capturas no dependen de la pantalla de login.

## Qué siembra `seed.py`, y por qué así

Los datos no son de relleno: cada uno existe para que una regla se vea o se caiga.

- **Inversiones Katiuska** tiene una operación creada *ayer* cuyo comprobante
  entró hace *29 días*. La antigüedad se mide desde que llegó el dinero, no desde
  que se registró la operación — las que el bot no reconoce se crean a mano días
  después. Tanto la franja del listado como la pestaña «Cuenta» del perfil deben
  leer 29 d; si alguna dice 1 d, está mirando la fecha de la operación.
- Katiuska tiene además una operación **registrada hace 20 días y pagada
  anteayer**. En Operaciones tiene que salir por su fecha de salida, no hundida
  al fondo por su `created_at`; en la cuenta del cliente, arriba del todo.
- **Yeimar A. Rondón** tiene una operación sin cubrir y **sin comprobante
  entrante**: su dinero no ha llegado, así que no se le debe nada. Tiene que
  salir sin deuda en la lista y con la cuenta vacía. Si aparece debiendo 350, la
  pantalla volvió a contar las dos patas del cambio como una.
- **Bodegón El Ávila** debe en dos monedas a la vez, para ver el desglose
  (`89.891,00 VES + 315,00 USDT`). Una sola cifra ahí sería una suma de monedas
  distintas, que es mentira.
- Una operación **sin beneficiario**: no se puede dar por entregada, y la
  interfaz tiene que decir por qué en vez de esconderla.
- Clientes sin deuda, uno bloqueado y uno sin nombre, para que la lista se
  parezca a la de verdad y no sólo a los casos bonitos.

## Ir más allá de la captura

Una captura prueba que pinta; no prueba que responde. Si el cambio va de
comportamiento —un filtro, un orden, un botón— condúcelo. `shot.js` es un script
corto de Playwright: cópialo y añade los clics.

```js
await page.locator('#clients-pending-filter').click();
await page.getByRole('option', { name: 'Con pendiente' }).click();
await page.waitForTimeout(1000);
// el orden por defecto debe pasar a «Monto» al activar el filtro
console.log(await page.getByRole('button', { pressed: true }).first().innerText());
```

## Rutas útiles

| Qué | Dónde |
|---|---|
| Web | http://127.0.0.1:3010 |
| API + OpenAPI | http://127.0.0.1:8010 · `/docs` |
| Entrar | `admin@local.test` / `Admin12345` |
| Logs | `/tmp/next.log`, `/tmp/api.log`, `/tmp/pgdata/pg.log` |
| Pantallas del admin | `/admin/clients`, `/admin/operations`, `/admin/payments`, `/admin/funds` |

`stack.sh` escribe `.env.local` con la URL de la API. Está en `.gitignore`, pero
`stack.sh down` lo borra igualmente para no dejar rastro en el árbol.
