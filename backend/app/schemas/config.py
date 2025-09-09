from pydantic import BaseModel
from typing import Optional


class ConfigCreate(BaseModel):
    title: str


class ConfigRead(BaseModel):
    id: int
    title: str
    file_path: str

    class Config:
        from_attributes = True


class SignedURL(BaseModel):
    url: str
    expires_in: int