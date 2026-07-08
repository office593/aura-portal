from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from auth_utils import get_current_tenant, require_admin

router = APIRouter(prefix="/announcements", tags=["announcements"])


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    priority: str = "normal"
    target_group: Optional[str] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    priority: Optional[str] = None
    target_group: Optional[str] = None


@router.get("/")
def get_announcements(
    db: Session = Depends(get_db),
    current_tenant: models.Tenant = Depends(get_current_tenant),
):
    tenant_project = current_tenant.project
    query = db.query(models.Announcement)
    if not current_tenant.is_admin:
        query = query.filter(
            or_(
                models.Announcement.target_group == None,
                models.Announcement.target_group == tenant_project,
            )
        )
    items = query.order_by(models.Announcement.published_at.desc()).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "body": a.body,
            "priority": a.priority,
            "published_at": a.published_at.isoformat() if a.published_at else None,
            "target_group": a.target_group,
        }
        for a in items
    ]


@router.post("/", dependencies=[Depends(require_admin)])
def create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db)):
    item = models.Announcement(**data.model_dump(), published_at=datetime.utcnow())
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id}


@router.put("/{ann_id}", dependencies=[Depends(require_admin)])
def update_announcement(ann_id: int, data: AnnouncementUpdate, db: Session = Depends(get_db)):
    ann = db.query(models.Announcement).filter(models.Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ann, field, value)
    db.commit()
    return {"ok": True}


@router.delete("/{ann_id}", dependencies=[Depends(require_admin)])
def delete_announcement(ann_id: int, db: Session = Depends(get_db)):
    ann = db.query(models.Announcement).filter(models.Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404)
    db.delete(ann)
    db.commit()
    return {"ok": True}
