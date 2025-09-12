from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import Base
from app.core.db_compat import get_json_column


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    title = Column(String(255), nullable=False)
    payload = Column(get_json_column(), nullable=False)
    status = Column(String(50), nullable=False, default="unread")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)