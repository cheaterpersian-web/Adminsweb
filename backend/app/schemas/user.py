from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class UserBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: str = "operator"
    is_active: bool = True


class UserCreate(UserBase):
    password: str
    username: Optional[str] = None

    @field_validator("email")
    def email_optional_for_operator(cls, v, info):
        # Allow missing email only when role is operator
        role = info.data.get("role") if hasattr(info, "data") else None
        if v is None and role != "operator":
            raise ValueError("Email is required unless role is operator")
        return v

    @field_validator("username")
    def username_required_if_no_email_for_operator(cls, v, info):
        role = info.data.get("role") if hasattr(info, "data") else None
        email = info.data.get("email") if hasattr(info, "data") else None
        if role == "operator" and (not email) and (not v or not str(v).strip()):
            raise ValueError("Username is required when email is missing for operator")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True