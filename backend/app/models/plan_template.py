from sqlalchemy import Column, Integer, Numeric, ForeignKey, UniqueConstraint, String
from app.db.base import Base


class PlanTemplate(Base):
    __tablename__ = "plan_templates"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)


class PlanTemplateItem(Base):
    __tablename__ = "plan_template_items"

    id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey("plan_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("plan.id", ondelete="CASCADE"), nullable=False, index=True)
    price_override = Column(Numeric(12, 2), nullable=False)
    __table_args__ = (
        UniqueConstraint("template_id", "plan_id", name="uq_plan_template_item"),
    )


class UserPlanTemplate(Base):
    __tablename__ = "user_plan_templates"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    template_id = Column(Integer, ForeignKey("plan_templates.id", ondelete="CASCADE"), nullable=False)