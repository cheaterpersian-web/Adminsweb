from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.db.base import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    panel_id = Column(Integer, ForeignKey("panels.id", ondelete="CASCADE"), nullable=False)


class TemplateInbound(Base):
    __tablename__ = "template_inbounds"

    id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True)
    inbound_id = Column(String(255), nullable=False)
    __table_args__ = (
        UniqueConstraint("template_id", "inbound_id", name="uq_template_inbound"),
    )


class UserTemplate(Base):
    __tablename__ = "user_templates"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)

