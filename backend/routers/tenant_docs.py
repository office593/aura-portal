import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from auth_utils import get_current_tenant, require_admin

router = APIRouter(prefix="/tenant-docs", tags=["tenant-docs"])

UPLOADS_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {".pdf"}
MAX_SIZE_BYTES = None  # ללא הגבלה


def doc_to_dict(d: models.TenantDocument) -> dict:
    return {
        "id": d.id,
        "tenant_id": d.tenant_id,
        "filename": d.filename,
        "url": d.url,
        "caption": d.caption,
        "is_personal": d.is_personal,
        "created_at": str(d.created_at),
    }


@router.get("/my")
def get_my_docs(
    tenant: models.Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    docs = (
        db.query(models.TenantDocument)
        .filter(models.TenantDocument.tenant_id == tenant.id)
        .order_by(models.TenantDocument.created_at.desc())
        .all()
    )
    return [doc_to_dict(d) for d in docs]


@router.get("/by-tenant/{tenant_id}", dependencies=[Depends(require_admin)])
def get_tenant_docs(tenant_id: int, db: Session = Depends(get_db)):
    docs = (
        db.query(models.TenantDocument)
        .filter(models.TenantDocument.tenant_id == tenant_id)
        .order_by(models.TenantDocument.created_at.desc())
        .all()
    )
    return [doc_to_dict(d) for d in docs]


@router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_doc(
    tenant_id: int = Form(...),
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    is_personal: bool = Form(False),
    db: Session = Depends(get_db),
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="דייר לא נמצא")
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="יש לבחור קובץ PDF בלבד")
    contents = await file.read()
    filename = f"doc_{uuid.uuid4().hex}{suffix}"
    (UPLOADS_DIR / filename).write_bytes(contents)
    doc = models.TenantDocument(
        tenant_id=tenant_id,
        filename=file.filename,
        url=f"/uploads/{filename}",
        caption=caption,
        is_personal=is_personal,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc_to_dict(doc)


@router.delete("/{doc_id}", dependencies=[Depends(require_admin)])
def delete_doc(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.TenantDocument).filter(models.TenantDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404)
    db.delete(doc)
    db.commit()
    return {"ok": True}
