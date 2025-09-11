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
from app.services.audit import record_audit_event
from app.models.user_panel_credentials import UserPanelCredential

router = APIRouter()


@router.get("/users", response_model=List[UserRead])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    return db.query(User).order_by(User.id.desc()).all()


@router.post("/users", response_model=UserRead)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    # Unique check only if email provided
    if payload.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email or f"{payload.name}@local",
        phone=payload.phone,
        role=payload.role,
        is_active=True,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    record_audit_event(db, user_id=current_user.id, action="create_user", target=str(user.id), meta={"email": user.email})

    # If operator, create matching admin on Marzban panel (first configured panel)
    if user.role == "operator":
        settings = get_settings()
        # pick first panel
        from app.models.panel import Panel
        panel = db.query(Panel).order_by(Panel.id.asc()).first()
        if panel:
            async def create_admin_on_panel():
                async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
                    # login root admin configured in panel record
                    try:
                        tok_res = await client.post(panel.base_url.rstrip("/") + "/api/admin/token", data={"username": panel.username, "password": panel.password})
                        token = None
                        if tok_res.headers.get("content-type", "").startswith("application/json"):
                            jd = tok_res.json(); token = jd.get("access_token") or jd.get("token")
                        if not token:
                            return
                        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                        # create admin
                        payload_admin = {"username": user.name, "password": payload.password}
                        await client.post(panel.base_url.rstrip("/") + "/api/admin", json=payload_admin, headers=headers)
                        # save operator's panel creds
                        try:
                            rec = db.query(UserPanelCredential).filter(UserPanelCredential.user_id == user.id, UserPanelCredential.panel_id == panel.id).first()
                            if not rec:
                                rec = UserPanelCredential(user_id=user.id, panel_id=panel.id, username=user.name, password=payload.password)
                            else:
                                rec.username = user.name; rec.password = payload.password
                            db.add(rec); db.commit()
                        except Exception:
                            db.rollback()
                    except Exception:
                        return
            try:
                import asyncio
                asyncio.create_task(create_admin_on_panel())
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