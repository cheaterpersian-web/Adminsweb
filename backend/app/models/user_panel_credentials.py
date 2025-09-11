from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.db.base import Base


class UserPanelCredential(Base):
    __tablename__ = "user_panel_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    panel_id = Column(Integer, ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True)
    username = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)  # NOTE: stored as-is; consider encryption in production

    __table_args__ = (
        UniqueConstraint("user_id", "panel_id", name="uq_user_panel_cred"),
    )

