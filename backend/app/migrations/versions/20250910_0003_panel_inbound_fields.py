from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250910_0003_panel_inbound_fields"
down_revision: Union[str, None] = "20250910_0002_create_panels"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("panels", sa.Column("inbound_id", sa.String(length=255), nullable=True))
    op.add_column("panels", sa.Column("inbound_tag", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("panels", "inbound_tag")
    op.drop_column("panels", "inbound_id")

