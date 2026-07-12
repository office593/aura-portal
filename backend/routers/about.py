from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import os, uuid
from database import get_db
import models
from auth_utils import get_current_tenant, require_admin
from storage import save_file

router = APIRouter(prefix="/about", tags=["about"])


class ProjectCreate(BaseModel):
    name: str
    location: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    order: int = 0


class PressCreate(BaseModel):
    title: str
    source: Optional[str] = None
    date: Optional[str] = None
    url: Optional[str] = None
    order: int = 0


@router.get("/projects")
def get_projects(db: Session = Depends(get_db), _=Depends(get_current_tenant)):
    items = db.query(models.AboutProject).order_by(models.AboutProject.order).all()
    return [{"id": i.id, "name": i.name, "location": i.location, "description": i.description, "url": i.url, "order": i.order} for i in items]


@router.post("/projects", dependencies=[Depends(require_admin)])
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    item = models.AboutProject(**data.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "name": item.name, "location": item.location, "description": item.description, "url": item.url, "order": item.order}


@router.put("/projects/{item_id}", dependencies=[Depends(require_admin)])
def update_project(item_id: int, data: ProjectCreate, db: Session = Depends(get_db)):
    item = db.query(models.AboutProject).filter(models.AboutProject.id == item_id).first()
    if not item: raise HTTPException(status_code=404)
    for k, v in data.model_dump().items(): setattr(item, k, v)
    db.commit()
    return {"id": item.id, "name": item.name, "location": item.location, "description": item.description, "url": item.url, "order": item.order}


@router.delete("/projects/{item_id}", dependencies=[Depends(require_admin)])
def delete_project(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.AboutProject).filter(models.AboutProject.id == item_id).first()
    if not item: raise HTTPException(status_code=404)
    db.delete(item); db.commit()
    return {"ok": True}


@router.get("/press")
def get_press(db: Session = Depends(get_db), _=Depends(get_current_tenant)):
    items = db.query(models.PressItem).order_by(models.PressItem.order).all()
    return [{"id": i.id, "title": i.title, "source": i.source, "date": i.date, "url": i.url, "order": i.order} for i in items]


@router.post("/press", dependencies=[Depends(require_admin)])
def create_press(data: PressCreate, db: Session = Depends(get_db)):
    item = models.PressItem(**data.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "title": item.title, "source": item.source, "date": item.date, "url": item.url, "order": item.order}


@router.put("/press/{item_id}", dependencies=[Depends(require_admin)])
def update_press(item_id: int, data: PressCreate, db: Session = Depends(get_db)):
    item = db.query(models.PressItem).filter(models.PressItem.id == item_id).first()
    if not item: raise HTTPException(status_code=404)
    for k, v in data.model_dump().items(): setattr(item, k, v)
    db.commit()
    return {"id": item.id, "title": item.title, "source": item.source, "date": item.date, "url": item.url, "order": item.order}


@router.delete("/press/{item_id}", dependencies=[Depends(require_admin)])
def delete_press(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.PressItem).filter(models.PressItem.id == item_id).first()
    if not item: raise HTTPException(status_code=404)
    db.delete(item); db.commit()
    return {"ok": True}


class CompanyInfoUpdate(BaseModel):
    founder_name: Optional[str] = None
    founder_title: Optional[str] = None
    founder_years: Optional[str] = None
    founder_description: Optional[str] = None


@router.get("/company")
def get_company(db: Session = Depends(get_db)):
    info = db.query(models.CompanyInfo).first()
    if not info:
        return {"founder_name": None, "founder_title": None, "founder_years": None, "founder_description": None, "founder_image_url": None}
    return {"founder_name": info.founder_name, "founder_title": info.founder_title, "founder_years": info.founder_years, "founder_description": info.founder_description, "founder_image_url": info.founder_image_url}


@router.put("/company", dependencies=[Depends(require_admin)])
def update_company(data: CompanyInfoUpdate, db: Session = Depends(get_db)):
    info = db.query(models.CompanyInfo).first()
    if not info:
        info = models.CompanyInfo()
        db.add(info)
    for k, v in data.model_dump().items():
        setattr(info, k, v)
    db.commit()
    return {"ok": True}


@router.post("/company/upload-image", dependencies=[Depends(require_admin)])
async def upload_founder_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower()
    fname = f"founder_{uuid.uuid4().hex}{ext}"
    contents = await file.read()
    url = save_file(contents, fname, content_type=file.content_type)
    info = db.query(models.CompanyInfo).first()
    if not info:
        info = models.CompanyInfo(founder_image_url=url)
        db.add(info)
    else:
        info.founder_image_url = url
    db.commit()
    return {"url": url}
