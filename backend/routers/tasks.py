from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from auth_utils import require_admin, get_current_tenant

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    due_date: Optional[str] = None


class CompleteTask(BaseModel):
    notes: Optional[str] = None
    completed_by_id: int
    completed_by_name: str


def task_to_dict(t: models.Task) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "assigned_to_id": t.assigned_to_id,
        "assigned_to_name": t.assigned_to_name,
        "status": t.status,
        "completed_by_id": t.completed_by_id,
        "completed_by_name": t.completed_by_name,
        "notes": t.notes,
        "due_date": t.due_date,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


@router.get("/", dependencies=[Depends(require_admin)])
def list_tasks(assigned_to_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Task)
    if assigned_to_id:
        q = q.filter(models.Task.assigned_to_id == assigned_to_id)
    items = q.order_by(models.Task.created_at.desc()).all()
    return [task_to_dict(t) for t in items]


@router.post("/", dependencies=[Depends(require_admin)])
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = models.Task(**data.model_dump(), created_at=datetime.utcnow())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_dict(task)


@router.patch("/{task_id}/complete", dependencies=[Depends(require_admin)])
def complete_task(task_id: int, data: CompleteTask, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)
    task.status = "done"
    task.completed_by_id = data.completed_by_id
    task.completed_by_name = data.completed_by_name
    task.notes = data.notes
    db.commit()
    return task_to_dict(task)


@router.patch("/{task_id}/reopen", dependencies=[Depends(require_admin)])
def reopen_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)
    task.status = "pending"
    task.completed_by_id = None
    task.completed_by_name = None
    task.notes = None
    db.commit()
    return task_to_dict(task)


@router.delete("/{task_id}", dependencies=[Depends(require_admin)])
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)
    db.delete(task)
    db.commit()
    return {"ok": True}
