"""
SQLite-compatible models for development
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(32), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="viewer")
    is_active = Column(Boolean, nullable=False, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)


class Panel(Base):
    __tablename__ = "panels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    base_url = Column(String(512), nullable=False)
    username = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)
    inbound_id = Column(String(255), nullable=True)
    inbound_tag = Column(String(255), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False, server_default='false')


class RootAdmin(Base):
    __tablename__ = "root_admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (
        # SQLite doesn't support named constraints the same way
        # We'll handle uniqueness in application logic
    )


class PanelInbound(Base):
    __tablename__ = "panel_inbounds"

    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True)
    inbound_id = Column(String(255), nullable=False)
    inbound_tag = Column(String(255), nullable=True)


class PanelCreatedUser(Base):
    __tablename__ = "panel_created_users"

    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True)
    username = Column(String(255), nullable=False)
    subscription_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserPanelCredential(Base):
    __tablename__ = "user_panel_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    panel_id = Column(Integer, ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True)
    username = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(120), nullable=False)
    target = Column(String(255), nullable=True)
    meta = Column(Text, nullable=True)  # JSON as text for SQLite
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    title = Column(String(255), nullable=False)
    payload = Column(Text, nullable=False)  # JSON as text for SQLite
    status = Column(String(50), nullable=False, default="unread")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Config(Base):
    __tablename__ = "configs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)