"""add backup settings table

Revision ID: 20250911_0012
Revises: 20250911_0011
Create Date: 2025-09-11 00:12:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20250911_0012"
down_revision = "20250911_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "backup_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("telegram_bot_token", sa.String(length=255), nullable=True),
        sa.Column("telegram_admin_chat_id", sa.String(length=64), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("frequency_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("backup_settings")

