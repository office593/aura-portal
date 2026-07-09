import io
import json
import re
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from auth_utils import get_current_tenant, require_admin

UPLOADS_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_SIZE_BYTES = 10 * 1024 * 1024

router = APIRouter(prefix="/tenants", tags=["tenants"])


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    is_admin: Optional[bool] = None
    air_old: Optional[str] = None
    air_new: Optional[str] = None
    floor_old: Optional[str] = None
    floor_new: Optional[str] = None
    specs: Optional[str] = None
    project: Optional[str] = None
    id_number: Optional[str] = None
    id_image_url: Optional[str] = None


class TenantCreate(BaseModel):
    phone: str
    name: str
    is_admin: bool = False
    air_old: Optional[str] = None
    air_new: Optional[str] = None
    floor_old: Optional[str] = None
    floor_new: Optional[str] = None
    specs: Optional[str] = None
    project: Optional[str] = None


def tenant_to_dict(t: models.Tenant) -> dict:
    specs = {}
    if t.specs:
        try:
            specs = json.loads(t.specs)
        except Exception:
            pass
    return {
        "id": t.id,
        "phone": t.phone,
        "name": t.name,
        "is_admin": t.is_admin,
        "air_old": t.air_old,
        "air_new": t.air_new,
        "floor_old": t.floor_old,
        "floor_new": t.floor_new,
        "specs": specs,
        "avatar_url": t.avatar_url,
        "project": t.project,
        "has_signed": t.has_signed or False,
        "id_number": t.id_number,
        "id_image_url": t.id_image_url,
    }


@router.get("/me")
def get_me(tenant: models.Tenant = Depends(get_current_tenant)):
    return tenant_to_dict(tenant)


@router.get("/", dependencies=[Depends(require_admin)])
def list_tenants(db: Session = Depends(get_db)):
    tenants = db.query(models.Tenant).filter(models.Tenant.is_deleted == False).all()
    return [tenant_to_dict(t) for t in tenants]


@router.get("/deleted", dependencies=[Depends(require_admin)])
def list_deleted_tenants(db: Session = Depends(get_db)):
    tenants = db.query(models.Tenant).filter(models.Tenant.is_deleted == True).all()
    return [tenant_to_dict(t) for t in tenants]


@router.post("/", dependencies=[Depends(require_admin)])
def create_tenant(data: TenantCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Tenant).filter(models.Tenant.phone == data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="מספר טלפון כבר קיים")
    tenant = models.Tenant(**data.model_dump())
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant_to_dict(tenant)


@router.put("/{tenant_id}", dependencies=[Depends(require_admin)])
def update_tenant(tenant_id: int, data: TenantUpdate, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="דייר לא נמצא")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(tenant, field, value)
    db.commit()
    return tenant_to_dict(tenant)


@router.delete("/{tenant_id}/avatar", dependencies=[Depends(require_admin)])
def remove_avatar(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="דייר לא נמצא")
    tenant.avatar_url = None
    db.commit()
    return tenant_to_dict(tenant)


@router.post("/{tenant_id}/avatar", dependencies=[Depends(require_admin)])
async def upload_avatar(tenant_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="דייר לא נמצא")
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך")
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="הקובץ גדול מדי. מקסימום 10MB.")
    filename = f"avatar_{uuid.uuid4().hex}{suffix}"
    (UPLOADS_DIR / filename).write_bytes(contents)
    tenant.avatar_url = f"/uploads/{filename}"
    db.commit()
    return tenant_to_dict(tenant)


@router.patch("/{tenant_id}/sign", dependencies=[Depends(require_admin)])
def toggle_sign(tenant_id: int, db: Session = Depends(get_db)):
    t = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404)
    t.has_signed = not (t.has_signed or False)
    db.commit()
    return {"has_signed": t.has_signed}


def _find_drive_image(folder_id: str, api_key: str, id_number: str) -> Optional[str]:
    try:
        import truststore
        truststore.inject_into_ssl()
        import requests as _requests
        q = f"'{folder_id}' in parents and name contains '{id_number}'"
        r = _requests.get(
            "https://www.googleapis.com/drive/v3/files",
            params={"q": q, "key": api_key, "fields": "files(id,name)"},
            timeout=10,
        )
        files = r.json().get("files", [])
        exact = [f for f in files if f["name"].split(".")[0] == id_number]
        chosen = exact[0] if exact else (files[0] if files else None)
        if chosen:
            name = chosen["name"].lower()
            fid = chosen["id"]
            if name.endswith(".pdf"):
                return f"https://drive.google.com/file/d/{fid}/preview"
            return f"https://drive.google.com/uc?export=view&id={fid}"
    except Exception:
        pass
    return None


@router.post("/import-excel", dependencies=[Depends(require_admin)])
async def import_tenants_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas לא מותקן בשרת")

    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"שגיאה בקריאת הקובץ: {e}")

    # load Drive settings once
    from routers.settings import get_setting
    drive_folder_id = get_setting(db, "drive_folder_id")
    drive_api_key = get_setting(db, "drive_api_key")
    use_drive = bool(drive_folder_id and drive_api_key)

    created, skipped_dup, skipped_no_phone = 0, 0, 0
    seen_phones = set()
    new_tenants = []

    for _, row in df.iterrows():
        first = str(row.get('שם פרטי', '') or '').strip()
        last  = str(row.get('שם משפחה', '') or '').strip()
        phone_raw = str(row.get('טלפון נייד', '') or '').strip()

        if not phone_raw or phone_raw.lower() in ('nan', '', 'none'):
            skipped_no_phone += 1
            continue

        phone = re.sub(r'[^\d]', '', phone_raw)
        if not phone.startswith('0'):
            phone = '0' + phone
        if len(phone) < 9:
            skipped_no_phone += 1
            continue

        if phone in seen_phones:
            skipped_dup += 1
            continue
        seen_phones.add(phone)

        id_raw = ''
        for col in row.index:
            col_str = str(col)
            if 'ת.ז' in col_str or 'תעודת' in col_str or 'ת״ז' in col_str:
                id_raw = str(row[col] or '').strip()
                if id_raw and id_raw.lower() not in ('nan', 'none', ''):
                    break
        id_number = re.sub(r'[^\d]', '', id_raw) or None

        name = f"{first} {last}".strip() or phone
        existing = db.query(models.Tenant).filter(models.Tenant.phone == phone).first()
        if existing:
            skipped_dup += 1
            continue

        id_image_url = None
        if use_drive and id_number:
            id_image_url = _find_drive_image(drive_folder_id, drive_api_key, id_number)

        t = models.Tenant(phone=phone, name=name, id_number=id_number, id_image_url=id_image_url)
        db.add(t)
        created += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"שגיאה בשמירה: {str(e)}")

    return {"created": created, "skipped_duplicate": skipped_dup, "skipped_no_phone": skipped_no_phone}


@router.get("/{tenant_id}/id-card-image", dependencies=[Depends(require_admin)])
def get_id_card_image(tenant_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import Response
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant or not tenant.id_image_url:
        raise HTTPException(status_code=404, detail="אין תעודת זהות")
    try:
        import truststore
        truststore.inject_into_ssl()
        import requests as _req, fitz, cv2, numpy as np, re
        m = re.search(r'/d/([a-zA-Z0-9_-]+)/preview|id=([a-zA-Z0-9_-]+)', tenant.id_image_url)
        if not m:
            raise HTTPException(status_code=400, detail="לא ניתן לחלץ file_id")
        file_id = m.group(1) or m.group(2)
        resp = _req.get(f"https://drive.google.com/uc?export=download&id={file_id}", timeout=30)
        doc = fitz.open(stream=resp.content, filetype="pdf")
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(2, 2))
        img_array = np.frombuffer(pix.tobytes("png"), np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        _, jpeg = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return Response(content=jpeg.tobytes(), media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{tenant_id}/extract-avatar", dependencies=[Depends(require_admin)])
def extract_avatar_from_id(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="דייר לא נמצא")
    if not tenant.id_image_url:
        raise HTTPException(status_code=400, detail="אין קובץ תעודת זהות לדייר זה")

    try:
        import re, httpx
        from PIL import Image
        import io

        file_id = None
        for pattern in [r'/d/([a-zA-Z0-9_-]+)/preview', r'id=([a-zA-Z0-9_-]+)']:
            m = re.search(pattern, tenant.id_image_url)
            if m:
                file_id = m.group(1)
                break
        if not file_id:
            raise HTTPException(status_code=400, detail="לא ניתן לחלץ file_id מהURL")

        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        resp = httpx.get(url, timeout=20, follow_redirects=True)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="שגיאה בהורדת הקובץ מDrive")

        content_type = resp.headers.get("content-type", "")
        if "pdf" in content_type or resp.content[:4] == b'%PDF':
            import fitz
            doc = fitz.open(stream=resp.content, filetype="pdf")
            pix = doc[0].get_pixmap(matrix=fitz.Matrix(2, 2))
            img = Image.open(io.BytesIO(pix.tobytes("png")))
        else:
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")

        w, h = img.size
        # חיתוך קבוע — פנים בתעודה ביומטרית ישראלית
        x1, y1 = int(w * 0.36), int(h * 0.13)
        x2, y2 = int(w * 0.60), int(h * 0.40)
        crop = img.crop((x1, y1, x2, y2))
        side = min(crop.size)
        cx, cy = crop.width // 2, crop.height // 2
        square = crop.crop((cx - side//2, cy - side//2, cx + side//2, cy + side//2))
        square = square.resize((300, 300), Image.LANCZOS)

        filename = f"avatar_{uuid.uuid4().hex}.jpg"
        buf = io.BytesIO()
        square.save(buf, format="JPEG", quality=88)
        (UPLOADS_DIR / filename).write_bytes(buf.getvalue())
        tenant.avatar_url = f"/uploads/{filename}"
        db.commit()
        return tenant_to_dict(tenant)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בחילוץ תמונה: {str(e)}")


@router.delete("/all", dependencies=[Depends(require_admin)])
def delete_all_tenants(db: Session = Depends(get_db)):
    count = db.query(models.Tenant).filter(models.Tenant.is_admin == False).delete()
    db.commit()
    return {"deleted": count}


@router.post("/{tenant_id}/restore", dependencies=[Depends(require_admin)])
def restore_tenant(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="דייר לא נמצא")
    tenant.is_deleted = False
    tenant.deleted_at = None
    db.commit()
    return tenant_to_dict(tenant)


@router.delete("/{tenant_id}", dependencies=[Depends(require_admin)])
def delete_tenant(tenant_id: int, db: Session = Depends(get_db)):
    from datetime import datetime
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="דייר לא נמצא")
    tenant.is_deleted = True
    tenant.deleted_at = datetime.utcnow()
    db.commit()
    return {"ok": True}
