from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from app.db.base import Base


class RootAdmin(Base):
    __tablename__ = "root_admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_root_admin_user"),
    )

