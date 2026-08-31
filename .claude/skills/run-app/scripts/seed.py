#!/usr/bin/env python3
"""
Datos de demo para ver las pantallas de admin con algo dentro.

Idempotente: se puede correr las veces que haga falta. Los clientes se buscan
por teléfono antes de crearlos; las operaciones sí se añaden en cada corrida,
así que para volver al punto de partida es `stack.sh reset`.

Lo que hay que saber antes de tocarlo:

- **Las migraciones ya siembran monedas y pares**, con símbolos separados por
  GUION (`USDT-VES`, `ZELLE-VES`) y sin USD. Crear `USD/VES` revienta contra
  `unique_currency_pair`. Por eso acá los pares se reutilizan, nunca se crean.
- **La antigüedad de una deuda sale de la fecha del comprobante entrante**, no
  de la de la operación: las que el bot no reconoce se crean a mano días
  después. Por eso Katiuska lleva una operación creada ayer con un pago de hace
  29 días — sin ese caso, una implementación que mire la fecha equivocada parece
  correcta. Ojo con dónde se mira: la pestaña «Cuenta» del perfil resuelve la
  fecha del pago y debe decir 29 d; el listado la agrega en el front por fecha
  de operación y dice otra cosa a propósito, hasta que consuma el `oldest_at`
  que ya devuelve el backend (ver `docs/api/clients-pending.md`).
- Hay un cliente que debe en DOS monedas a la vez, para ver el desglose
  (`89.891,00 VES + 315,00 USDT`) en vez de una suma imposible.
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# .../cambios-los-criollitos-fe/.claude/skills/run-app/scripts/seed.py
#     parents[4] es la raíz del front; el backend es su hermano.
FE = Path(__file__).resolve().parents[4]
BE = os.environ.get("BE_DIR") or str(FE.parent / "cambios-los-criollitos-be")
if not Path(BE, "app").is_dir():
    sys.exit(f"no encuentro el backend en {BE}; exporta BE_DIR apuntando a él")
sys.path.insert(0, BE)
os.environ.setdefault("DATABASE_URL", "postgresql://postgres@/criollitos?host=/tmp/pgsock&port=5599")
os.environ.setdefault("JWT_SECRET_KEY", "x" * 40)

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

import app.models  # noqa: F401,E402  — registra los modelos
from app.core.security import get_password_hash  # noqa: E402
from app.models.currency_pair import CurrencyPair  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.whatsapp_client import WhatsAppClient  # noqa: E402
from app.models.whatsapp_operation import (  # noqa: E402
    WhatsAppAmountSide,
    WhatsAppOperation,
    WhatsAppOperationStatus,
)
from app.models.whatsapp_payment import WhatsAppIncomingPayment  # noqa: E402

ADMIN_USER = "admin"
ADMIN_EMAIL = "admin@local.test"
ADMIN_PASSWORD = "Admin12345"

url = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+psycopg2://")
db = sessionmaker(bind=create_engine(url))()
NOW = datetime.now(timezone.utc)


def ensure_admin():
    if db.query(User).filter(User.username == ADMIN_USER).first():
        return
    db.add(User(
        email=ADMIN_EMAIL, username=ADMIN_USER,
        hashed_password=get_password_hash(ADMIN_PASSWORD),
        role="ROOT", is_active=True, is_verified=True,
    ))
    db.flush()


def client(phone, name, **flags):
    row = db.query(WhatsAppClient).filter(WhatsAppClient.phone == phone).first()
    if row is None:
        row = WhatsAppClient(phone=phone, display_name=name, last_seen_at=NOW)
        db.add(row)
        db.flush()
    for key, value in flags.items():
        setattr(row, key, value)
    return row


def operation(owner, pair, amount, currency, to_amount, days_ago,
              beneficiary="Yelitza Ramírez", paid_days_ago=None):
    """Una operación sin cubrir. `paid_days_ago` le cuelga un comprobante entrante."""
    op = WhatsAppOperation(
        client_id=owner.id, currency_pair_id=pair.id,
        amount=amount, currency=currency,
        from_amount=amount, to_amount=to_amount, rate_used=to_amount / amount,
        amount_side=WhatsAppAmountSide.SEND,
        status=WhatsAppOperationStatus.PENDING,
        expires_at=NOW, created_at=NOW - timedelta(days=days_ago),
        beneficiary_alias=beneficiary,
    )
    db.add(op)
    db.flush()
    if paid_days_ago is not None:
        db.add(WhatsAppIncomingPayment(
            client_phone=owner.phone, amount=amount, currency=currency,
            whatsapp_operation_id=op.id, created_at=NOW - timedelta(days=paid_days_ago),
        ))
    return op


def main():
    ensure_admin()
    pairs = {p.pair_symbol: p for p in db.query(CurrencyPair).all()}
    missing = [s for s in ("USDT-VES", "ZELLE-VES", "VES-COP") if s not in pairs]
    if missing:
        sys.exit(f"faltan pares en la base ({missing}); ¿corriste las migraciones?")
    usdt_ves, zelle_ves, ves_cop = pairs["USDT-VES"], pairs["ZELLE-VES"], pairs["VES-COP"]

    katiuska = client("entity:katiuska", "Inversiones Katiuska C.A.")
    # Creada ayer, pero el dinero entró hace 29 días: el caso que separa la
    # fecha del pago de la de la operación.
    operation(katiuska, usdt_ves, 500, "USDT", 142_700, 1, paid_days_ago=29)
    operation(katiuska, usdt_ves, 300, "USDT", 85_620, 5)
    operation(katiuska, usdt_ves, 713.33, "USDT", 203_585, 3, beneficiary=None)  # sin beneficiario: no entregable

    marielys = client("+584125510388@c.us", "Marielys C. Rondón", is_tracked=True)
    operation(marielys, usdt_ves, 520, "USDT", 148_320, 4)

    bodegon = client("120363@g.us", "Bodegón El Ávila")
    operation(bodegon, usdt_ves, 315, "USDT", 89_891, 2)
    operation(bodegon, ves_cop, 89_891, "VES", 21_000, 1)  # dos monedas a la vez

    yeimar = client("+584148829041@c.us", "Yeimar A. Rondón")
    operation(yeimar, zelle_ves, 350, "ZELLE", 292_652, 6)

    client("+584249930112@c.us", "Dayana Suárez", is_blocked=True)
    for i, name in enumerate(
        ["José G. Piñango", "Luis Bracho", "Ana Teresa Gil", None, "Carmen Rojas", "Pedro Salas"]
    ):
        client(f"+5841600000{i}@c.us", name)

    db.commit()
    print(
        f"sembrado: {db.query(WhatsAppClient).count()} clientes, "
        f"{db.query(WhatsAppOperation).count()} operaciones · "
        f"entra con {ADMIN_EMAIL} / {ADMIN_PASSWORD}"
    )


if __name__ == "__main__":
    main()
