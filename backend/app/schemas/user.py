from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class UserBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: str = "viewer"
    is_active: bool = True


class UserCreate(UserBase):
    password: str

    @field_validator("email")
    def email_optional_for_operator(cls, v, info):
        # Allow missing email only when role is operator
        role = info.data.get("role") if hasattr(info, "data") else None
        if v is None and role != "operator":
            raise ValueError("Email is required unless role is operator")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True