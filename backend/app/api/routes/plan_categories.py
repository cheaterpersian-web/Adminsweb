from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_root_admin, require_roles
from app.db.session import get_db
from app.models.plan_category import PlanCategory
from pydantic import BaseModel


router = APIRouter()


class CategoryCreate(BaseModel):
    name: str
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None


class CategoryRead(BaseModel):
    id: int
    name: str
    sort_order: int

    class Config:
        from_attributes = True


@router.get("/plan-categories", response_model=List[CategoryRead])
def list_cats(db: Session = Depends(get_db), _: Depends = Depends(require_roles(["admin", "operator"]))):
    rows = db.query(PlanCategory).order_by(PlanCategory.sort_order.asc(), PlanCategory.id.asc()).all()
    return [CategoryRead.from_orm(r) for r in rows]


@router.post("/plan-categories", response_model=CategoryRead)
def create_cat(payload: CategoryCreate, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    c = PlanCategory(name=payload.name, sort_order=payload.sort_order)
    db.add(c)
    db.commit()
    db.refresh(c)
    return CategoryRead.from_orm(c)


@router.put("/plan-categories/{cat_id}", response_model=CategoryRead)
def update_cat(cat_id: int, payload: CategoryUpdate, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    c = db.query(PlanCategory).filter(PlanCategory.id == cat_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    if payload.name is not None:
        c.name = payload.name
    if payload.sort_order is not None:
        c.sort_order = payload.sort_order
    db.add(c)
    db.commit()
    db.refresh(c)
    return CategoryRead.from_orm(c)


@router.delete("/plan-categories/{cat_id}")
def delete_cat(cat_id: int, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    c = db.query(PlanCategory).filter(PlanCategory.id == cat_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(c)
    db.commit()
    return {"ok": True}

