from typing import Generator, Optional, Sequence
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
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