from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250910_0006_user_panel_creds"
down_revision: Union[str, None] = "20250910_0005_created_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_panel_credentials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("panel_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["panel_id"], ["panels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "panel_id", name="uq_user_panel_cred"),
    )
    op.create_index(op.f("ix_user_panel_credentials_id"), "user_panel_credentials", ["id"], unique=False)
    op.create_index(op.f("ix_user_panel_credentials_user_id"), "user_panel_credentials", ["user_id"], unique=False)
    op.create_index(op.f("ix_user_panel_credentials_panel_id"), "user_panel_credentials", ["panel_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_panel_credentials_panel_id"), table_name="user_panel_credentials")
    op.drop_index(op.f("ix_user_panel_credentials_user_id"), table_name="user_panel_credentials")
    op.drop_index(op.f("ix_user_panel_credentials_id"), table_name="user_panel_credentials")
    op.drop_table("user_panel_credentials")

