"""drop unique constrain on plans.name

Revision ID: 20250911_0015
Revises: 20250911_0014
Create Date: 2025-09-29 01:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20250911_0015"
down_revision = "20250911_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    table_name = "plan"
    # Drop unique constraints that include only the 'name' column
    try:
        uniques = insp.get_unique_constraints(table_name)
    except Exception:
        uniques = []
    for uc in uniques or []:
        cols = [c.lower() for c in (uc.get("column_names") or [])]
        if cols == ["name"] or (len(cols) == 1 and cols[0] == "name"):
            op.drop_constraint(uc.get("name"), table_name, type_="unique")

    # Drop unique indexes on 'name' if any
    try:
        idxs = insp.get_indexes(table_name)
    except Exception:
        idxs = []
    for ix in idxs or []:
        cols = [c.lower() for c in (ix.get("column_names") or [])]
        if ix.get("unique") and (cols == ["name"] or (len(cols) == 1 and cols[0] == "name")):
            op.drop_index(ix.get("name"), table_name=table_name)


def downgrade() -> None:
    # Create a non-unique index for performance; ignore if exists
    try:
        op.create_index("ix_plan_name", "plan", ["name"], unique=False)
    except Exception:
        pass

