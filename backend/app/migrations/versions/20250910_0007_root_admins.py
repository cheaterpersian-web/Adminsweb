from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250910_0007_root_admins"
down_revision: Union[str, None] = "20250910_0006_user_panel_credentials"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "root_admins",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_root_admin_user"),
    )
    op.create_index(op.f("ix_root_admins_id"), "root_admins", ["id"], unique=False)
    op.create_index(op.f("ix_root_admins_user_id"), "root_admins", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_root_admins_user_id"), table_name="root_admins")
    op.drop_index(op.f("ix_root_admins_id"), table_name="root_admins")
    op.drop_table("root_admins")

