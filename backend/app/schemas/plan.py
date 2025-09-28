from pydantic import BaseModel, Field, conint, condecimal
from typing import Optional


class PlanBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    data_quota_mb: Optional[conint(ge=0)] = None
    is_data_unlimited: bool = False
    duration_days: Optional[conint(ge=0)] = None
    is_duration_unlimited: bool = False
    price: condecimal(max_digits=12, decimal_places=2) = Field(default=0)
    category_id: Optional[int] = None
    sort_order: int = 0


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    data_quota_mb: Optional[conint(ge=0)] = None
    is_data_unlimited: Optional[bool] = None
    duration_days: Optional[conint(ge=0)] = None
    is_duration_unlimited: Optional[bool] = None
    price: Optional[condecimal(max_digits=12, decimal_places=2)] = None
    category_id: Optional[int] = None
    sort_order: Optional[int] = None


class PlanRead(PlanBase):
    id: int

    class Config:
        from_attributes = True

