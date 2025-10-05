"""create templates and user_templates

Revision ID: 20250911_0010
Revises: 20250911_0009
Create Date: 2025-09-11 00:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20250911_0010"
down_revision = "20250911_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("panel_id", sa.Integer(), sa.ForeignKey("panels.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_table(
        "template_inbounds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("inbound_id", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("template_id", "inbound_id", name="uq_template_inbound"),
    )
    op.create_table(
        "user_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("templates.id", ondelete="CASCADE"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_templates")
    op.drop_table("template_inbounds")
    op.drop_table("templates")

