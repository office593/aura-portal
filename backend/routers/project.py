from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from auth_utils import get_current_tenant, require_admin

router = APIRouter(prefix="/project", tags=["project"])


class StageUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    target_date: Optional[str] = None
    completion_pct: Optional[float] = None
    description: Optional[str] = None
    order: Optional[int] = None


class StageCreate(BaseModel):
    name: str
    category: Optional[str] = None
    order: int
    status: str = "pending"
    target_date: Optional[str] = None
    completion_pct: float = 0.0
    description: Optional[str] = None


@router.get("/stages")
def get_stages(
    db: Session = Depends(get_db),
    _: models.Tenant = Depends(get_current_tenant),
):
    stages = db.query(models.ProjectStage).order_by(models.ProjectStage.order).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "order": s.order,
            "status": s.status,
            "target_date": s.target_date,
            "completion_pct": s.completion_pct,
            "description": s.description,
        }
        for s in stages
    ]


CATEGORY_WEIGHTS = {
    'תב"ע': 0.55,
    'תכנית עיצוב אדריכלי': 0.20,
    'היתר בנייה': 0.25,
}

@router.get("/overall")
def get_overall(
    db: Session = Depends(get_db),
    _: models.Tenant = Depends(get_current_tenant),
):
    stages = db.query(models.ProjectStage).all()
    if not stages:
        return {"overall_pct": 0}
    # Weighted average by category
    total = 0.0
    used_weight = 0.0
    for cat, weight in CATEGORY_WEIGHTS.items():
        cat_stages = [s for s in stages if s.category == cat]
        if cat_stages:
            cat_avg = sum(s.completion_pct for s in cat_stages) / len(cat_stages)
            total += cat_avg * weight
            used_weight += weight
    # Fallback for stages without category
    uncat = [s for s in stages if not s.category or s.category not in CATEGORY_WEIGHTS]
    remaining = 1.0 - used_weight
    if uncat and remaining > 0:
        total += (sum(s.completion_pct for s in uncat) / len(uncat)) * remaining
    return {"overall_pct": round(total, 1)}


@router.post("/stages", dependencies=[Depends(require_admin)])
def create_stage(data: StageCreate, db: Session = Depends(get_db)):
    stage = models.ProjectStage(**data.model_dump())
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return {"id": stage.id}


@router.put("/stages/{stage_id}", dependencies=[Depends(require_admin)])
def update_stage(stage_id: int, data: StageUpdate, db: Session = Depends(get_db)):
    stage = db.query(models.ProjectStage).filter(models.ProjectStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="שלב לא נמצא")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(stage, field, value)
    db.commit()
    return {"ok": True}


@router.delete("/stages/{stage_id}", dependencies=[Depends(require_admin)])
def delete_stage(stage_id: int, db: Session = Depends(get_db)):
    stage = db.query(models.ProjectStage).filter(models.ProjectStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404)
    db.delete(stage)
    db.commit()
    return {"ok": True}
