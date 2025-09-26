from sqlalchemy import BigInteger, Boolean, Column, Integer, Numeric, String
from app.db.base import Base


class Plan(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)

    # Quota in megabytes (nullable when unlimited)
    data_quota_mb = Column(BigInteger, nullable=True)
    is_data_unlimited = Column(Boolean, nullable=False, default=False)

    # Duration in days (nullable when unlimited)
    duration_days = Column(Integer, nullable=True)
    is_duration_unlimited = Column(Boolean, nullable=False, default=False)

    # Price in smallest currency unit (e.g., rial/toman/cents), decimals supported via Numeric
    price = Column(Numeric(12, 2), nullable=False, default=0)

