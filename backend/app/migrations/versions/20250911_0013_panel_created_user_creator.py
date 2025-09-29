"""add created_by_user_id to panel_created_users

Revision ID: 20250911_0013
Revises: 20250911_0012
Create Date: 2025-09-29 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20250911_0013"
down_revision = "20250911_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("panel_created_users", sa.Column("created_by_user_id", sa.Integer(), nullable=True))
    try:
        op.create_index("ix_panel_created_users_created_by_user_id", "panel_created_users", ["created_by_user_id"], unique=False)
    except Exception:
        pass
    try:
        op.create_foreign_key("fk_panel_created_users_creator", "panel_created_users", "users", ["created_by_user_id"], ["id"], ondelete="SET NULL")
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_constraint("fk_panel_created_users_creator", "panel_created_users", type_="foreignkey")
    except Exception:
        pass
    try:
        op.drop_index("ix_panel_created_users_created_by_user_id", table_name="panel_created_users")
    except Exception:
        pass
    op.drop_column("panel_created_users", "created_by_user_id")

