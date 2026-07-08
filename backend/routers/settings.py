from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from auth_utils import require_admin

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingValue(BaseModel):
    value: Optional[str] = None


def get_setting(db: Session, key: str) -> Optional[str]:
    row = db.query(models.AppSettings).filter(models.AppSettings.key == key).first()
    return row.value if row else None


@router.get("/", dependencies=[Depends(require_admin)])
def get_all_settings(db: Session = Depends(get_db)):
    rows = db.query(models.AppSettings).all()
    return {r.key: r.value for r in rows}


@router.put("/{key}", dependencies=[Depends(require_admin)])
def set_setting(key: str, body: SettingValue, db: Session = Depends(get_db)):
    row = db.query(models.AppSettings).filter(models.AppSettings.key == key).first()
    if row:
        row.value = body.value
    else:
        db.add(models.AppSettings(key=key, value=body.value))
    db.commit()
    return {"key": key, "value": body.value}
