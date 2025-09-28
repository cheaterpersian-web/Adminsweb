from sqlalchemy import Column, Integer, String
from app.db.base import Base


class PlanCategory(Base):
    __tablename__ = "plan_categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    sort_order = Column(Integer, nullable=False, default=0)

