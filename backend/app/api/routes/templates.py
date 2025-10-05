from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_root_admin, require_roles, get_current_user
from app.models.user import User
from app.db.session import get_db
from app.models.template import Template, TemplateInbound, UserTemplate
from app.models.plan_template import PlanTemplate, PlanTemplateItem, UserPlanTemplate
from decimal import Decimal
from pydantic import BaseModel
from app.schemas.template import TemplateCreate, TemplateRead, TemplateUpdate, AssignTemplateRequest


router = APIRouter()


def _template_to_read(db: Session, t: Template) -> TemplateRead:
    inbound_ids = [row.inbound_id for row in db.query(TemplateInbound).filter(TemplateInbound.template_id == t.id).all()]
    return TemplateRead(id=t.id, name=t.name, panel_id=t.panel_id, inbound_ids=inbound_ids)


@router.get("/templates", response_model=List[TemplateRead])
def list_templates(db: Session = Depends(get_db), _: Depends = Depends(require_roles(["admin", "operator"]))):
    rows = db.query(Template).order_by(Template.id.desc()).all()
    return [_template_to_read(db, r) for r in rows]


@router.post("/templates", response_model=TemplateRead)
def create_template(payload: TemplateCreate, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    t = Template(name=payload.name, panel_id=payload.panel_id)
    db.add(t)
    db.commit()
    db.refresh(t)
    # save inbounds
    for inbound_id in payload.inbound_ids:
        db.add(TemplateInbound(template_id=t.id, inbound_id=inbound_id))
    db.commit()
    return _template_to_read(db, t)


@router.put("/templates/{template_id}", response_model=TemplateRead)
def update_template(template_id: int, payload: TemplateUpdate, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    if payload.name is not None:
        t.name = payload.name
    if payload.panel_id is not None:
        t.panel_id = payload.panel_id
    db.add(t)
    db.commit()
    if payload.inbound_ids is not None:
        db.query(TemplateInbound).filter(TemplateInbound.template_id == t.id).delete()
        for inbound_id in payload.inbound_ids:
            db.add(TemplateInbound(template_id=t.id, inbound_id=inbound_id))
        db.commit()
    return _template_to_read(db, t)


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.query(TemplateInbound).filter(TemplateInbound.template_id == t.id).delete()
    db.delete(t)
    db.commit()
    return {"ok": True}


# ----- Plan Templates (for per-operator pricing) -----

class PlanTemplateItemPayload(BaseModel):
    plan_id: int
    price_override: Decimal


class PlanTemplateCreate(BaseModel):
    name: str
    items: list[PlanTemplateItemPayload] = []


class PlanTemplateRead(BaseModel):
    id: int
    name: str
    items: list[PlanTemplateItemPayload]


@router.get("/plan-templates", response_model=list[PlanTemplateRead])
def list_plan_templates(db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    rows = db.query(PlanTemplate).order_by(PlanTemplate.id.desc()).all()
    out: list[PlanTemplateRead] = []
    for t in rows:
        items = [PlanTemplateItemPayload(plan_id=it.plan_id, price_override=it.price_override) for it in db.query(PlanTemplateItem).filter(PlanTemplateItem.template_id == t.id).all()]
        out.append(PlanTemplateRead(id=t.id, name=t.name, items=items))
    return out


@router.post("/plan-templates", response_model=PlanTemplateRead)
def create_plan_template(payload: PlanTemplateCreate, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    t = PlanTemplate(name=payload.name)
    db.add(t)
    db.commit()
    db.refresh(t)
    for it in payload.items:
        db.add(PlanTemplateItem(template_id=t.id, plan_id=it.plan_id, price_override=it.price_override))
    db.commit()
    items = [PlanTemplateItemPayload(plan_id=it.plan_id, price_override=it.price_override) for it in db.query(PlanTemplateItem).filter(PlanTemplateItem.template_id == t.id).all()]
    return PlanTemplateRead(id=t.id, name=t.name, items=items)


class PlanTemplateUpdate(BaseModel):
    name: str | None = None
    items: list[PlanTemplateItemPayload] | None = None


@router.put("/plan-templates/{template_id}", response_model=PlanTemplateRead)
def update_plan_template(template_id: int, payload: PlanTemplateUpdate, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    t = db.query(PlanTemplate).filter(PlanTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Plan template not found")
    if payload.name is not None:
        t.name = payload.name
    db.add(t)
    db.commit()
    if payload.items is not None:
        db.query(PlanTemplateItem).filter(PlanTemplateItem.template_id == t.id).delete()
        for it in payload.items:
            db.add(PlanTemplateItem(template_id=t.id, plan_id=it.plan_id, price_override=it.price_override))
        db.commit()
    items = [PlanTemplateItemPayload(plan_id=it.plan_id, price_override=it.price_override) for it in db.query(PlanTemplateItem).filter(PlanTemplateItem.template_id == t.id).all()]
    return PlanTemplateRead(id=t.id, name=t.name, items=items)


@router.delete("/plan-templates/{template_id}")
def delete_plan_template(template_id: int, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    t = db.query(PlanTemplate).filter(PlanTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Plan template not found")
    db.query(PlanTemplateItem).filter(PlanTemplateItem.template_id == t.id).delete()
    db.delete(t)
    db.commit()
    return {"ok": True}


class AssignPlanTemplatePayload(BaseModel):
    user_id: int
    template_id: int


@router.post("/plan-templates/assign")
def assign_plan_template(payload: AssignPlanTemplatePayload, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    rec = db.query(UserPlanTemplate).filter(UserPlanTemplate.user_id == payload.user_id).first()
    if not rec:
        rec = UserPlanTemplate(user_id=payload.user_id, template_id=payload.template_id)
        db.add(rec)
    else:
        rec.template_id = payload.template_id
        db.add(rec)
    db.commit()
    return {"ok": True}


@router.post("/templates/assign")
def assign_template(payload: AssignTemplateRequest, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    # upsert
    rec = db.query(UserTemplate).filter(UserTemplate.user_id == payload.user_id).first()
    if not rec:
        rec = UserTemplate(user_id=payload.user_id, template_id=payload.template_id)
        db.add(rec)
    else:
        rec.template_id = payload.template_id
        db.add(rec)
    db.commit()
    return {"ok": True}


@router.get("/templates/assigned/{user_id}")
def get_assigned_template(user_id: int, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    rec = db.query(UserTemplate).filter(UserTemplate.user_id == user_id).first()
    return {"template_id": rec.template_id if rec else None}


@router.get("/templates/assigned/me", response_model=TemplateRead | None)
def get_assigned_template_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rec = db.query(UserTemplate).filter(UserTemplate.user_id == current_user.id).first()
    if not rec:
        return None
    t = db.query(Template).filter(Template.id == rec.template_id).first()
    if not t:
        return None
    return _template_to_read(db, t)


