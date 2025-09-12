from sqlalchemy import Column, Integer, String, ForeignKey, Text
from app.db.base import Base
from app.core.db_compat import get_json_column


class AdminsNode(Base):
    __tablename__ = "admins_nodes"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(255), nullable=False, index=True)
    node_name = Column(String(255), nullable=True)
    meta = Column("metadata", get_json_column(), nullable=True)