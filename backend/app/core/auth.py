from typing import Generator, Optional, Sequence
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.models.root_admin import RootAdmin
from app.models.user import User

settings = get_settings()

reuseable_oauth = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_prefix}/auth/login",
    scheme_name="JWT",
)


def get_current_user(db: Session = Depends(get_db), token: str = Depends(reuseable_oauth)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "access":
            raise credentials_exception
        subject: Optional[str] = payload.get("sub")
        if subject is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(subject)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_roles(allowed_roles: Sequence[str]):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency


def require_root_admin(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    # Root admin if:
    # 1) user is admin AND email is in ROOT_ADMIN_EMAILS, OR
    # 2) user is admin AND exists in root_admins table
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Root admin only")
    emails = {e.strip().lower() for e in settings.root_admin_emails.split(",") if e.strip()}
    is_env_root = user.email.lower() in emails
    is_db_root = db.query(RootAdmin).filter(RootAdmin.user_id == user.id).first() is not None
    if not (is_env_root or is_db_root):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Root admin only")
    return user