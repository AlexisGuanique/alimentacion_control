"""add_weight_entry_table

Revision ID: a3c1d8e2f094
Revises: fffb69ef0a1c
Create Date: 2026-03-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = 'a3c1d8e2f094'
down_revision: Union[str, None] = 'fffb69ef0a1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS evita error si create_db_and_tables() ya la creó
    bind = op.get_bind()
    from sqlalchemy import inspect as sa_inspect
    if 'weightentry' in sa_inspect(bind).get_table_names():
        return
    op.create_table(
        'weightentry',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('weight_kg', sa.Float(), nullable=False),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('recorded_at', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_weightentry_user_id', 'weightentry', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_weightentry_user_id', table_name='weightentry')
    op.drop_table('weightentry')
