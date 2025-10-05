"""create plans table

Revision ID: 20250911_0008
Revises: 20250910_0007_root_admins
Create Date: 2025-09-11 00:08:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250911_0008"
down_revision = "20250910_0007_root_admins"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plan",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("data_quota_mb", sa.BigInteger(), nullable=True),
        sa.Column("is_data_unlimited", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("duration_days", sa.Integer(), nullable=True),
        sa.Column("is_duration_unlimited", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("price", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("plan")

