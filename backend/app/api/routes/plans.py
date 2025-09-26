from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_root_admin
from app.db.session import get_db
from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanRead, PlanUpdate


router = APIRouter()


@router.get("/plans", response_model=List[PlanRead])
def list_plans(_: Depends = Depends(require_root_admin), db: Session = Depends(get_db)):
    return db.query(Plan).order_by(Plan.id.desc()).all()


@router.post("/plans", response_model=PlanRead)
def create_plan(payload: PlanCreate, _: Depends = Depends(require_root_admin), db: Session = Depends(get_db)):
    if payload.is_data_unlimited:
        data_quota_mb = None
    else:
        data_quota_mb = payload.data_quota_mb or 0
    if payload.is_duration_unlimited:
        duration_days = None
    else:
        duration_days = payload.duration_days or 0

    if db.query(Plan).filter(Plan.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Plan with this name already exists")

    plan = Plan(
        name=payload.name,
        data_quota_mb=data_quota_mb,
        is_data_unlimited=bool(payload.is_data_unlimited),
        duration_days=duration_days,
        is_duration_unlimited=bool(payload.is_duration_unlimited),
        price=payload.price,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/plans/{plan_id}", response_model=PlanRead)
def update_plan(plan_id: int, payload: PlanUpdate, _: Depends = Depends(require_root_admin), db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if payload.name is not None:
        exists = db.query(Plan).filter(Plan.name == payload.name, Plan.id != plan_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Plan name already in use")
        plan.name = payload.name

    if payload.is_data_unlimited is not None:
        plan.is_data_unlimited = payload.is_data_unlimited
        if payload.is_data_unlimited:
            plan.data_quota_mb = None
    if payload.data_quota_mb is not None and not plan.is_data_unlimited:
        plan.data_quota_mb = payload.data_quota_mb

    if payload.is_duration_unlimited is not None:
        plan.is_duration_unlimited = payload.is_duration_unlimited
        if payload.is_duration_unlimited:
            plan.duration_days = None
    if payload.duration_days is not None and not plan.is_duration_unlimited:
        plan.duration_days = payload.duration_days

    if payload.price is not None:
        plan.price = payload.price

    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}")
def delete_plan(plan_id: int, _: Depends = Depends(require_root_admin), db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
    return {"ok": True}

