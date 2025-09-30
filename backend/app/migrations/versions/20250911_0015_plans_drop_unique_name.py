"""drop unique constrain on plans.name

Revision ID: 20250911_0015
Revises: 20250911_0014
Create Date: 2025-09-29 01:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20250911_0015"
down_revision = "20250911_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Try to drop unique constraint or index on name if exists
    try:
        op.drop_constraint("plan_name_key", "plan", type_="unique")
    except Exception:
        pass
    try:
        op.drop_index("ix_plan_name", table_name="plan")
    except Exception:
        pass


def downgrade() -> None:
    # Not re-creating unique to avoid collisions; create a non-unique index for performance
    try:
        op.create_index("ix_plan_name", "plan", ["name"], unique=False)
    except Exception:
        pass

