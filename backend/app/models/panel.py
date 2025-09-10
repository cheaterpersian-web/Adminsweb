from sqlalchemy import Column, Integer, String
from app.db.base import Base


class Panel(Base):
    __tablename__ = "panels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    base_url = Column(String(512), nullable=False)
    username = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)

