from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250910_0005_created_users"
down_revision: Union[str, None] = "20250910_0004_panel_inbounds"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "panel_created_users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("panel_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("subscription_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["panel_id"], ["panels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("panel_id", "username", name="uq_panel_user"),
    )
    op.create_index(op.f("ix_panel_created_users_id"), "panel_created_users", ["id"], unique=False)
    op.create_index(op.f("ix_panel_created_users_panel_id"), "panel_created_users", ["panel_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_panel_created_users_panel_id"), table_name="panel_created_users")
    op.drop_index(op.f("ix_panel_created_users_id"), table_name="panel_created_users")
    op.drop_table("panel_created_users")

