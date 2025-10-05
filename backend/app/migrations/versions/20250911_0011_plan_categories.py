"""add plan categories and plan fields

Revision ID: 20250911_0011
Revises: 20250911_0010
Create Date: 2025-09-11 00:11:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20250911_0011"
down_revision = "20250911_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plan_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("plan", sa.Column("category_id", sa.Integer(), sa.ForeignKey("plan_categories.id", ondelete="SET NULL"), nullable=True))
    op.add_column("plan", sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("plan", "sort_order")
    op.drop_column("plan", "category_id")
    op.drop_table("plan_categories")

