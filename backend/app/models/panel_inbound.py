from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class PanelInbound(Base):
    __tablename__ = "panel_inbounds"

    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True)
    inbound_id = Column(String(255), nullable=False)
    inbound_tag = Column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("panel_id", "inbound_id", name="uq_panel_inbound"),
    )

