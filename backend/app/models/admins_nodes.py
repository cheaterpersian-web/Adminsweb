from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base


class AdminNode(Base):
    __tablename__ = "admins_nodes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    status = Column(String(32), nullable=False, default="offline")
    last_seen = Column(DateTime(timezone=True), nullable=True)
    meta = Column("metadata", JSONB, nullable=True)