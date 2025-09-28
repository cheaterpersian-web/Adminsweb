from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base import Base


class BackupSetting(Base):
    __tablename__ = "backup_settings"

    id = Column(Integer, primary_key=True)
    telegram_bot_token = Column(String(255), nullable=True)
    telegram_admin_chat_id = Column(String(64), nullable=True)
    enabled = Column(Boolean, nullable=False, default=False)
    frequency_minutes = Column(Integer, nullable=False, default=60)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

