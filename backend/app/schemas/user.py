from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str = "viewer"
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True