from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.core.auth import require_roles, get_current_user
from app.core.security import hash_password
from app.services.audit import record_audit_event

router = APIRouter()


@router.get("/users", response_model=List[UserRead])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    return db.query(User).order_by(User.id.desc()).all()


@router.post("/users", response_model=UserRead)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        is_active=True,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    record_audit_event(db, user_id=current_user.id, action="create_user", target=str(user.id), meta={"email": user.email})
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