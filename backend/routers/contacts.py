import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from auth_utils import get_current_tenant, require_admin
from storage import save_file

router = APIRouter(prefix="/contacts", tags=["contacts"])


class ContactCreate(BaseModel):
    name: str
    role: str = ""
    phone: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    avatar_url: Optional[str] = None
    type: str = "contact"
    category: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    avatar_url: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = None


def contact_to_dict(c):
    return {
        "id": c.id,
        "name": c.name,
        "role": c.role,
        "phone": c.phone,
        "email": c.email,
        "whatsapp": c.whatsapp,
        "avatar_url": c.avatar_url,
        "type": c.type or "contact",
        "website": c.website,
        "category": c.category,
    }


@router.get("/")
def get_contacts(
    db: Session = Depends(get_db),
    _: models.Tenant = Depends(get_current_tenant),
):
    contacts = db.query(models.Contact).filter(models.Contact.type == "contact").all()
    return [contact_to_dict(c) for c in contacts]


@router.get("/professionals")
def get_professionals(
    db: Session = Depends(get_db),
    _: models.Tenant = Depends(get_current_tenant),
):
    pros = db.query(models.Contact).filter(models.Contact.type == "professional").all()
    return [contact_to_dict(c) for c in pros]


@router.post("/", dependencies=[Depends(require_admin)])
def create_contact(data: ContactCreate, db: Session = Depends(get_db)):
    contact = models.Contact(**data.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact_to_dict(contact)


@router.put("/{contact_id}", dependencies=[Depends(require_admin)])
def update_contact(contact_id: int, data: ContactUpdate, db: Session = Depends(get_db)):
    c = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not c:
        raise HTTPException(status_code=404)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    db.commit()
    return contact_to_dict(c)


@router.post("/{contact_id}/avatar", dependencies=[Depends(require_admin)])
async def upload_avatar(contact_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    c = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not c:
        raise HTTPException(status_code=404)
    suffix = Path(file.filename).suffix.lower()
    contents = await file.read()
    filename = f"pro_{uuid.uuid4().hex}{suffix}"
    c.avatar_url = save_file(contents, filename, content_type=file.content_type)
    db.commit()
    return contact_to_dict(c)


@router.delete("/{contact_id}", dependencies=[Depends(require_admin)])
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not c:
        raise HTTPException(status_code=404)
    db.delete(c)
    db.commit()
    return {"ok": True}
