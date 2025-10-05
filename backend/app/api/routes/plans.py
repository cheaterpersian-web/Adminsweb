from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_root_admin, require_roles, get_current_user
from app.db.session import get_db
from app.models.plan import Plan
from app.models.plan_template import UserPlanTemplate, PlanTemplateItem
from app.schemas.plan import PlanCreate, PlanRead, PlanUpdate
from app.models.user import User


router = APIRouter()


@router.get("/plans", response_model=List[PlanRead])
def list_plans(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin", "operator"]))):
    plans = db.query(Plan).order_by(Plan.category_id.asc(), Plan.sort_order.asc(), Plan.id.asc()).all()
    # If operator, try to fetch assigned plan template and attach effective_price
    try:
        if current_user.role == "operator":
            upt = db.query(UserPlanTemplate).filter(UserPlanTemplate.user_id == current_user.id).first()
            if upt:
                overrides = {row.plan_id: row.price_override for row in db.query(PlanTemplateItem).filter(PlanTemplateItem.template_id == upt.template_id).all()}
                result: list[PlanRead] = []
                for p in plans:
                    pr = PlanRead.from_orm(p)
                    if p.id in overrides:
                        pr.effective_price = overrides[p.id]
                    else:
                        pr.effective_price = p.price
                    result.append(pr)
                return result
    except Exception:
        pass
    # Default: set effective_price to base price
    res = []
    for p in plans:
        pr = PlanRead.from_orm(p)
        pr.effective_price = p.price
        res.append(pr)
    return res


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

    # Allow duplicate names per request

    plan = Plan(
        name=payload.name,
        data_quota_mb=data_quota_mb,
        is_data_unlimited=bool(payload.is_data_unlimited),
        duration_days=duration_days,
        is_duration_unlimited=bool(payload.is_duration_unlimited),
        price=payload.price,
        category_id=payload.category_id,
        sort_order=payload.sort_order,
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
    if payload.category_id is not None:
        plan.category_id = payload.category_id
    if payload.sort_order is not None:
        plan.sort_order = payload.sort_order

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

