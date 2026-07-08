import truststore
truststore.inject_into_ssl()
import requests, fitz, cv2, numpy as np
from database import SessionLocal
from routers.settings import get_setting

db = SessionLocal()
folder_id = get_setting(db, "drive_folder_id")
api_key = get_setting(db, "drive_api_key")
db.close()

r = requests.get("https://www.googleapis.com/drive/v3/files",
    params={"q": f"'{folder_id}' in parents", "key": api_key, "fields": "files(id,name)", "pageSize": 1}, timeout=10)
file_id = r.json()["files"][0]["id"]
resp = requests.get(f"https://drive.google.com/uc?export=download&id={file_id}", timeout=30)

doc = fitz.open(stream=resp.content, filetype="pdf")
pix = doc[0].get_pixmap(matrix=fitz.Matrix(3, 3))
img_array = np.frombuffer(pix.tobytes("png"), np.uint8)
img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
h, w = img.shape[:2]

# 50% של הכרטיס (5%-92% מהדף) = ~48.5% מהדף
# חיתוך: 36%-60% אופקי, כל גובה הכרטיס 13%-40%
x1, y1 = int(w * 0.36), int(h * 0.13)
x2, y2 = int(w * 0.60), int(h * 0.40)
crop = img[y1:y2, x1:x2]

side = min(crop.shape[:2])
cx, cy = crop.shape[1]//2, crop.shape[0]//2
square = crop[cy-side//2:cy+side//2, cx-side//2:cx+side//2]
cv2.imwrite("uploads/face_50pct.jpg", square)
print(f"saved face_50pct.jpg ({square.shape[1]}x{square.shape[0]})")
