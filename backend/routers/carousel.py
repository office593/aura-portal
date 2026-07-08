import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import get_current_tenant, require_admin

router = APIRouter(prefix="/carousel", tags=["carousel"])

UPLOADS_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGES = 3


@router.get("/")
def list_images(db: Session = Depends(get_db)):
    items = db.query(models.CarouselImage).order_by(models.CarouselImage.order).all()
    return [{"id": i.id, "url": i.url, "order": i.order} for i in items]


@router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    count = db.query(models.CarouselImage).count()
    if count >= MAX_IMAGES:
        raise HTTPException(status_code=400, detail="מקסימום 3 תמונות בקרוסלה")
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך")
    contents = await file.read()
    filename = f"carousel_{uuid.uuid4().hex}{suffix}"
    (UPLOADS_DIR / filename).write_bytes(contents)
    order = count
    img = models.CarouselImage(url=f"/uploads/{filename}", order=order)
    db.add(img)
    db.commit()
    db.refresh(img)
    return {"id": img.id, "url": img.url, "order": img.order}


@router.delete("/{image_id}", dependencies=[Depends(require_admin)])
def delete_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(models.CarouselImage).filter(models.CarouselImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404)
    db.delete(img)
    db.commit()
    return {"ok": True}
