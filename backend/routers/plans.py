import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from auth_utils import get_current_tenant, require_admin

router = APIRouter(prefix="/plans", tags=["plans"])

UPLOADS_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_SIZE_BYTES = 10 * 1024 * 1024


@router.get("/")
def list_plans(db: Session = Depends(get_db), _: models.Tenant = Depends(get_current_tenant)):
    items = db.query(models.PlanFile).order_by(models.PlanFile.created_at.desc()).all()
    return [{"id": i.id, "url": i.url, "caption": i.caption, "created_at": str(i.created_at)} for i in items]


@router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_plan(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך. יש לבחור JPG, JPEG או PNG.")
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="הקובץ גדול מדי. מקסימום 10 מגה-בייט.")
    filename = f"{uuid.uuid4().hex}{suffix}"
    (UPLOADS_DIR / filename).write_bytes(contents)
    item = models.PlanFile(url=f"/uploads/{filename}", caption=caption)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "url": item.url, "caption": item.caption}


@router.delete("/{plan_id}", dependencies=[Depends(require_admin)])
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    item = db.query(models.PlanFile).filter(models.PlanFile.id == plan_id).first()
    if not item:
        raise HTTPException(status_code=404)
    db.delete(item)
    db.commit()
    return {"ok": True}
