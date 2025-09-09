from pydantic import BaseModel
from typing import Optional, Any


class AuditLogRead(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    target: Optional[str]
    meta: Optional[Any]

    class Config:
        from_attributes = True