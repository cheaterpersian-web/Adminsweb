"""add type to panels (marzban|xui)

Revision ID: 20250911_0014
Revises: 20250911_0013
Create Date: 2025-09-29 00:20:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20250911_0014"
down_revision = "20250911_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("panels", sa.Column("type", sa.String(length=32), nullable=False, server_default="marzban"))


def downgrade() -> None:
    op.drop_column("panels", "type")

