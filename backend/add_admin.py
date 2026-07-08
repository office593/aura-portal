from database import SessionLocal
import models

db = SessionLocal()
existing = db.query(models.Tenant).filter(models.Tenant.phone == "0524760267").first()
if existing:
    existing.is_admin = True
    print("updated")
else:
    db.add(models.Tenant(phone="0524760267", name="manager", is_admin=True))
    print("created")
db.commit()
db.close()
