from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base


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
    type = Column(String(32), nullable=False, default="marzban", server_default='marzban')

