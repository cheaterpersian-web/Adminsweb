from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from fastapi import status

from app.schemas.auth import LoginRequest, TokenPair
from app.db.session import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.services.audit import record_audit_event
from app.core.limiter import limiter

router = APIRouter()


@router.post("/auth/login", response_model=TokenPair)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    # Allow login with either email or username stored in email field
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password) or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user.last_login = datetime.now(tz=timezone.utc)
    db.add(user)
    db.commit()
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    record_audit_event(db, user_id=user.id, action="login", target="auth")
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/auth/refresh", response_model=TokenPair)
@limiter.limit("30/minute")
def refresh_token(request: Request, refresh_token: str):
    # For simplicity, we trust the provided refresh token and issue a new access token if valid
    from jose import jwt, JWTError
    from app.core.config import get_settings

    settings = get_settings()
    try:
        payload = jwt.decode(refresh_token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        subject = payload.get("sub")
        if subject is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    new_access = create_access_token(str(subject))
    return TokenPair(access_token=new_access, refresh_token=refresh_token)