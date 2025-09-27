from pydantic import BaseModel, Field
from typing import List


class TemplateBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    panel_id: int
    inbound_ids: List[str]


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: str | None = None
    panel_id: int | None = None
    inbound_ids: List[str] | None = None


class TemplateRead(BaseModel):
    id: int
    name: str
    panel_id: int
    inbound_ids: List[str]


class AssignTemplateRequest(BaseModel):
    user_id: int
    template_id: int

