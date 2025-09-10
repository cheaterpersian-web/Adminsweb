from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250910_0004_panel_inbounds"
down_revision: Union[str, None] = "20250910_0003_inbound"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "panel_inbounds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("panel_id", sa.Integer(), nullable=False),
        sa.Column("inbound_id", sa.String(length=255), nullable=False),
        sa.Column("inbound_tag", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["panel_id"], ["panels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("panel_id", "inbound_id", name="uq_panel_inbound"),
    )
    op.create_index(op.f("ix_panel_inbounds_id"), "panel_inbounds", ["id"], unique=False)
    op.create_index(op.f("ix_panel_inbounds_panel_id"), "panel_inbounds", ["panel_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_panel_inbounds_panel_id"), table_name="panel_inbounds")
    op.drop_index(op.f("ix_panel_inbounds_id"), table_name="panel_inbounds")
    op.drop_table("panel_inbounds")

