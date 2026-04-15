"""add routine table

Revision ID: b7d2e4f1a839
Revises: a3c1d8e2f094
Create Date: 2026-03-31

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


revision = "b7d2e4f1a839"
down_revision = "a3c1d8e2f094"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if "routine" in sa_inspect(bind).get_table_names():
        return
    op.create_table(
        "routine",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("goal", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("duration_weeks", sa.Integer(), nullable=False, default=4),
        sa.Column("days_per_week", sa.Integer(), nullable=False, default=3),
        sa.Column("fitness_level", sa.String(), nullable=False, default="Intermedio"),
        sa.Column("equipment", sa.String(), nullable=False, default="Gimnasio completo"),
        sa.Column("content_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
    )


def downgrade():
    op.drop_table("routine")
