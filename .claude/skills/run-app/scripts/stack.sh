#!/usr/bin/env bash
# Levanta (o para) la pila entera: Postgres + API FastAPI + Next.js.
#
# Idempotente a propósito: se puede volver a lanzar sin limpiar nada. En un
# contenedor efímero los procesos se mueren entre sesiones y lo único que
# sobrevive es /tmp/pgdata, así que "volver a levantar" es la operación normal,
# no la excepción.
#
#   ./stack.sh up      arranca lo que falte y espera a que respondan
#   ./stack.sh down    para API y web (Postgres se queda: recrearlo es caro)
#   ./stack.sh status   qué está vivo
#   ./stack.sh reset   borra la base y la recrea desde cero
set -uo pipefail

FE="${FE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)}"
BE="${BE_DIR:-$(dirname "$FE")/cambios-los-criollitos-be}"

PGPORT=5599
PGSOCK=/tmp/pgsock
PGDATA=/tmp/pgdata
DB=criollitos
API_PORT=8010
WEB_PORT=3010

export DATABASE_URL="postgresql://postgres@/$DB?host=$PGSOCK&port=$PGPORT"
export JWT_SECRET_KEY="${JWT_SECRET_KEY:-$(printf 'x%.0s' {1..40})}"
export PYTHONPATH="$BE"

PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)"
say() { printf '\033[1m%s\033[0m\n' "$*"; }
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# Postgres se niega a correr como root, así que todo lo suyo va vía un usuario
# sin privilegios. `postgres` existe si el paquete lo creó; si no, uno propio.
pg_user() { id -u postgres >/dev/null 2>&1 && echo postgres || echo pgrunner; }
as_pg() { su "$(pg_user)" -s /bin/bash -c "$1"; }

pg_alive() { "$PGBIN/pg_isready" -h "$PGSOCK" -p "$PGPORT" -q 2>/dev/null; }

start_pg() {
  pg_alive && { say "postgres ya está arriba"; return 0; }
  [ -n "$PGBIN" ] || die "falta postgresql: apt-get install -y postgresql"

  id -u "$(pg_user)" >/dev/null 2>&1 || useradd -m pgrunner
  mkdir -p "$PGSOCK"; chown -R "$(pg_user)" "$PGSOCK"

  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    say "initdb (primera vez)"
    rm -rf "$PGDATA"; mkdir -p "$PGDATA"; chown -R "$(pg_user)" "$PGDATA"
    as_pg "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null || die "initdb falló"
  fi

  # listen_addresses vacío = sólo socket unix. No hace falta TCP y evita chocar
  # con cualquier otro Postgres del contenedor.
  as_pg "$PGBIN/pg_ctl -D $PGDATA -o '-p $PGPORT -k $PGSOCK -c listen_addresses=' -l $PGDATA/pg.log start" >/dev/null
  for _ in $(seq 20); do pg_alive && break; sleep 0.5; done
  pg_alive || { tail -20 "$PGDATA/pg.log"; die "postgres no arrancó"; }
  say "postgres arriba en $PGSOCK:$PGPORT"
}

ensure_db() {
  "$PGBIN/psql" -h "$PGSOCK" -p "$PGPORT" -U postgres -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$DB" \
    || "$PGBIN/psql" -h "$PGSOCK" -p "$PGPORT" -U postgres -c "CREATE DATABASE $DB" >/dev/null
}

install_deps() {
  python3 -c "import fastapi" 2>/dev/null && return 0
  say "instalando dependencias del backend"
  # http-ece no compila acá (y pywebpush depende de él). Se filtran DESDE EL
  # PRINCIPIO: si se intenta instalar todo y falla a la mitad, deja paquetes a
  # medias y aparecen fallos sin relación — el típico es una PanicException de
  # pyo3 al importar `cryptography` desde `jose`.
  grep -viE 'http-ece|pywebpush' "$BE/requirements.txt" > /tmp/req-lite.txt
  pip install -q -r /tmp/req-lite.txt || die "pip falló"
  # El código importa pywebpush aunque no se usen las notificaciones push.
  python3 - <<'PY'
import site, pathlib
stub = pathlib.Path(site.getsitepackages()[0]) / "pywebpush.py"
stub.write_text(
    'class WebPushException(Exception):\n    pass\n\n\n'
    'def webpush(*a, **k):\n'
    '    raise WebPushException("stub local: push deshabilitado")\n'
)
PY
}

start_api() {
  curl -sf "http://127.0.0.1:$API_PORT/docs" >/dev/null 2>&1 && { say "api ya está arriba"; return 0; }
  install_deps
  ensure_db
  say "migrando"
  (cd "$BE" && alembic upgrade head >/tmp/alembic.log 2>&1) || { tail -15 /tmp/alembic.log; die "alembic falló"; }
  say "arrancando api"
  (cd "$BE" && setsid python3 -m uvicorn app.main:app --host 127.0.0.1 --port "$API_PORT" </dev/null >/tmp/api.log 2>&1 & echo $! > /tmp/criollitos-api.pid)
  for _ in $(seq 40); do curl -sf "http://127.0.0.1:$API_PORT/docs" >/dev/null && break; sleep 0.5; done
  curl -sf "http://127.0.0.1:$API_PORT/docs" >/dev/null || { tail -20 /tmp/api.log; die "api no arrancó"; }
  say "api arriba en :$API_PORT"
}

start_web() {
  curl -sf "http://127.0.0.1:$WEB_PORT" >/dev/null 2>&1 && { say "web ya está arriba"; return 0; }
  [ -d "$FE/node_modules" ] || (say "npm ci"; cd "$FE" && npm ci >/tmp/npm.log 2>&1) || die "npm ci falló"
  # .env.local está en .gitignore, así que es seguro escribirlo.
  echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:$API_PORT" > "$FE/.env.local"
  say "arrancando next"
  (cd "$FE" && setsid npx next dev --port "$WEB_PORT" </dev/null >/tmp/next.log 2>&1 & echo $! > /tmp/criollitos-web.pid)
  for _ in $(seq 60); do curl -sf "http://127.0.0.1:$WEB_PORT" >/dev/null && break; sleep 0.5; done
  curl -sf "http://127.0.0.1:$WEB_PORT" >/dev/null || { tail -20 /tmp/next.log; die "next no arrancó"; }
  say "web arriba en http://127.0.0.1:$WEB_PORT"
}

case "${1:-up}" in
  up)
    start_pg; start_api; start_web
    say "listo — siembra con: python3 $(dirname "$0")/seed.py"
    ;;
  down)
    # Nada de `pkill -f "next dev"`: ese patrón coincide con el propio shell que
    # corre este script, que se suicida antes de parar nada.
    for pidfile in /tmp/criollitos-api.pid /tmp/criollitos-web.pid; do
      [ -f "$pidfile" ] || continue
      pid=$(cat "$pidfile")
      # Los dos arrancan hijos (uvicorn recarga, next forkea): se mata el grupo.
      kill -- "-$(ps -o pgid= "$pid" 2>/dev/null | tr -d ' ')" 2>/dev/null || kill "$pid" 2>/dev/null
      rm -f "$pidfile"
    done
    # Respaldo por puerto, que es lo que de verdad importa: el pidfile se pierde
    # al reciclarse el contenedor, y sin esto quedarían procesos zombis ocupando
    # el puerto que luego hacen creer que la pila está sana.
    # `ss` no está en todas las imágenes; `fuser` y `lsof` sí suelen estar.
    for port in "$API_PORT" "$WEB_PORT"; do
      if command -v fuser >/dev/null; then
        fuser -k -TERM "$port/tcp" >/dev/null 2>&1
      elif command -v lsof >/dev/null; then
        pids=$(lsof -ti "tcp:$port" 2>/dev/null)
        [ -n "$pids" ] && kill $pids 2>/dev/null
      fi
    done
    sleep 1
    rm -f "$FE/.env.local"
    say "api y web parados (postgres sigue arriba)"
    ;;
  reset)
    start_pg
    # La API mantiene conexiones abiertas y `DROP DATABASE` con una sola conexión viva
    # falla — y falla en silencio si nadie mira stderr, dejando la base intacta y el
    # sembrado encima del anterior. Se echan a todos antes de soltar.
    "$PGBIN/psql" -h "$PGSOCK" -p "$PGPORT" -U postgres -c \
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB'" >/dev/null
    "$PGBIN/psql" -h "$PGSOCK" -p "$PGPORT" -U postgres -c "DROP DATABASE IF EXISTS $DB" \
      >/dev/null || die "no se pudo borrar la base; para la API con 'stack.sh down' y reintenta"
    ensure_db
    (cd "$BE" && alembic upgrade head >/tmp/alembic.log 2>&1) || { tail -15 /tmp/alembic.log; die "alembic falló"; }
    say "base recreada y migrada"
    ;;
  status)
    pg_alive && say "postgres: arriba" || say "postgres: abajo"
    curl -sf "http://127.0.0.1:$API_PORT/docs" >/dev/null && say "api: arriba" || say "api: abajo"
    curl -sf "http://127.0.0.1:$WEB_PORT" >/dev/null && say "web: arriba" || say "web: abajo"
    ;;
  *) die "uso: stack.sh [up|down|reset|status]" ;;
esac
