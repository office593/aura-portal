from sqlalchemy import text
from database import engine, SessionLocal
from models import Tenant

# Migration — add columns if missing
with engine.connect() as conn:
    for col, typedef in [("is_deleted", "BOOLEAN DEFAULT 0"), ("deleted_at", "DATETIME")]:
        try:
            conn.execute(text(f"ALTER TABLE tenants ADD COLUMN {col} {typedef}"))
            conn.commit()
            print(f"added column {col}")
        except Exception:
            print(f"column {col} already exists")

db = SessionLocal()

# שחזור מורן פררה
existing = db.query(Tenant).filter(Tenant.phone == "0547444891").first()
if existing:
    existing.is_deleted = False
    existing.deleted_at = None
    db.commit()
    print("שוחזרה מורן פררה (קיימת)")
else:
    t = Tenant(
        phone="0547444891",
        name="מורן פררה",
        id_number="060959053",
        floor_old="4",
        floor_new="8",
        air_old="0.5",
        project="בעלים",
        has_signed=True,
        is_deleted=False,
    )
    db.add(t)
    db.commit()
    print("נוספה מורן פררה")

db.close()
print("סיום")
