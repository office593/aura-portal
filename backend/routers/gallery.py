import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from auth_utils import get_current_tenant, require_admin
from storage import save_file

router = APIRouter(prefix="/gallery", tags=["gallery"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


class GalleryItemCreate(BaseModel):
    url: str
    media_type: str = "image"
    stage_id: Optional[int] = None
    caption: Optional[str] = None
    category: Optional[str] = None


def item_to_dict(i):
    return {
        "id": i.id,
        "url": i.url,
        "media_type": i.media_type,
        "stage_id": i.stage_id,
        "caption": i.caption,
        "category": i.category,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }


@router.get("/")
def get_gallery(
    db: Session = Depends(get_db),
    _: models.Tenant = Depends(get_current_tenant),
):
    items = db.query(models.GalleryItem).order_by(models.GalleryItem.created_at.desc()).all()
    return [item_to_dict(i) for i in items]


@router.put("/{item_id}", dependencies=[Depends(require_admin)])
def update_item(item_id: int, data: dict, db: Session = Depends(get_db)):
    item = db.query(models.GalleryItem).filter(models.GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404)
    for field in ("caption", "category"):
        if field in data:
            setattr(item, field, data[field])
    db.commit()
    return item_to_dict(item)


@router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_image(
    file: UploadFile = File(...),
    stage_id: Optional[int] = Form(None),
    caption: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    # Validate extension
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך. יש להעלות JPG, JPEG או PNG בלבד.")

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="הקובץ גדול מדי. מקסימום 10 מגה-בייט.")

    # Save file with unique name
    filename = f"{uuid.uuid4().hex}{suffix}"
    url = save_file(contents, filename, content_type=file.content_type)

    item = models.GalleryItem(
        url=url,
        media_type="image",
        stage_id=stage_id,
        caption=caption,
        category=category,
        created_at=datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_to_dict(item)


@router.post("/", dependencies=[Depends(require_admin)])
def add_item(data: GalleryItemCreate, db: Session = Depends(get_db)):
    item = models.GalleryItem(**data.model_dump(), created_at=datetime.utcnow())
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id}


@router.delete("/{item_id}", dependencies=[Depends(require_admin)])
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.GalleryItem).filter(models.GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404)
    db.delete(item)
    db.commit()
    return {"ok": True}
