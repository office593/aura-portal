from database import SessionLocal
from models import Tenant
from routers.tenants import _find_drive_image
from routers.settings import get_setting

db = SessionLocal()
folder_id = get_setting(db, "drive_folder_id")
api_key = get_setting(db, "drive_api_key")
t = db.query(Tenant).filter(Tenant.phone == "0547444891").first()
if t:
    url = _find_drive_image(folder_id, api_key, "060959053")
    t.id_image_url = url
    db.commit()
    print("OK" if url else "NO FILE FOUND IN DRIVE")
db.close()
