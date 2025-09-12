from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.core.auth import require_roles, get_current_user
from app.core.security import hash_password
from app.core.config import get_settings
import httpx
import re
from app.models.panel import Panel
from app.models.user_panel_credentials import UserPanelCredential
from app.services.audit import record_audit_event

router = APIRouter()


@router.get("/users", response_model=List[UserRead])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles(["admin"]))):
    return db.query(User).order_by(User.id.desc()).all()


@router.post("/users", response_model=UserRead)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    # Unique check only if email provided
    if payload.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    # Determine stored email (panel form requires email but we allow username fallback)
    stored_email = payload.email or f"{(payload.username or payload.name).strip()}@local"

    user = User(
        name=payload.name,
        email=stored_email,
        phone=payload.phone,
        role=payload.role,
        is_active=True,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    record_audit_event(db, user_id=current_user.id, action="create_user", target=str(user.id), meta={"email": user.email})

    # If operator, create matching admin on Marzban panel(s)
    if user.role == "operator":
        panels = db.query(Panel).order_by(Panel.id.asc()).all()
        def make_username(base: str) -> str:
            u = re.sub(r"[^a-zA-Z0-9_]+", "_", base).strip("_")
            if not u:
                u = f"operator_{user.id}"
            return u[:32]
        op_username = make_username(payload.username or user.name)
        try:
            with httpx.Client(timeout=15.0, verify=False) as client:
                for panel in panels:
                    try:
                        login_url = panel.base_url.rstrip("/") + "/api/admin/token"
                        token = None
                        # try form first
                        resp = client.post(login_url, data={"username": panel.username, "password": panel.password})
                        if resp.headers.get("content-type", "").startswith("application/json"):
                            jd = resp.json(); token = jd.get("access_token") or jd.get("token")
                        if not token:
                            # try json
                            resp = client.post(login_url, json={"username": panel.username, "password": panel.password})
                            if resp.headers.get("content-type", "").startswith("application/json"):
                                jd = resp.json(); token = jd.get("access_token") or jd.get("token")
                        if not token:
                            continue
                        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                        create_url = panel.base_url.rstrip("/") + "/api/admin"
                        payload_admin = {
                            "username": op_username,
                            "is_sudo": False,
                            "telegram_id": 0,
                            "discord_webhook": "",
                            "users_usage": 0,
                            "password": payload.password,
                        }
                        r = client.post(create_url, json=payload_admin, headers=headers)
                        if 200 <= r.status_code < 300:
                            # save/update creds
                            try:
                                rec = db.query(UserPanelCredential).filter(UserPanelCredential.user_id == user.id, UserPanelCredential.panel_id == panel.id).first()
                                if not rec:
                                    rec = UserPanelCredential(user_id=user.id, panel_id=panel.id, username=op_username, password=payload.password)
                                else:
                                    rec.username = op_username; rec.password = payload.password
                                db.add(rec); db.commit()
                            except Exception:
                                db.rollback()
                        else:
                            # If already exists, try to update password
                            try:
                                upd_url = panel.base_url.rstrip("/") + f"/api/admin/{op_username}"
                                upd_payload = {"password": payload.password, "is_sudo": False}
                                ur = client.put(upd_url, json=upd_payload, headers=headers)
                                if 200 <= ur.status_code < 300:
                                    rec = db.query(UserPanelCredential).filter(UserPanelCredential.user_id == user.id, UserPanelCredential.panel_id == panel.id).first()
                                    if not rec:
                                        rec = UserPanelCredential(user_id=user.id, panel_id=panel.id, username=op_username, password=payload.password)
                                    else:
                                        rec.username = op_username; rec.password = payload.password
                                    db.add(rec); db.commit()
                            except Exception:
                                db.rollback()
                    except Exception:
                        continue
        except Exception:
            pass
    return user


@router.put("/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        user.name = payload.name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    record_audit_event(db, user_id=current_user.id, action="update_user", target=str(user.id))
    return user


@router.post("/users/{user_id}/disable", response_model=UserRead)
def disable_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.add(user)
    db.commit()
    db.refresh(user)
    record_audit_event(db, user_id=current_user.id, action="disable_user", target=str(user.id))
    return user


@router.post("/users/{user_id}/enable", response_model=UserRead)
def enable_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.add(user)
    db.commit()
    db.refresh(user)
    record_audit_event(db, user_id=current_user.id, action="enable_user", target=str(user.id))
    return user