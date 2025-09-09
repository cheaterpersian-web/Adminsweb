from pydantic import BaseModel
from typing import Any


class NotificationRead(BaseModel):
    id: int
    to_user: int
    payload: Any
    status: str

    class Config:
        from_attributes = True