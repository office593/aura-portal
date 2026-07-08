import truststore
truststore.inject_into_ssl()
import requests
from database import SessionLocal
from routers.settings import get_setting

db = SessionLocal()
folder_id = get_setting(db, "drive_folder_id")
api_key = get_setting(db, "drive_api_key")
db.close()

r = requests.get(
    "https://www.googleapis.com/drive/v3/files",
    params={"q": f"'{folder_id}' in parents", "key": api_key, "fields": "files(id,name)", "pageSize": 5},
    timeout=10,
)
print("status:", r.status_code)
data = r.json()
if "files" in data:
    print("files found:", len(data["files"]))
    for f in data["files"]:
        print(" -", f["name"], f["id"])
else:
    print("error:", data)
