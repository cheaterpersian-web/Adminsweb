from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.base import Base
from app.core.db_compat import get_json_column


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(120), nullable=False)
    target = Column(String(255), nullable=True)
    meta = Column(get_json_column(), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)