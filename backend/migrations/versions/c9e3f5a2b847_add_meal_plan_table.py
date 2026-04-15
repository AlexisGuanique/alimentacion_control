"""add meal plan table

Revision ID: c9e3f5a2b847
Revises: b7d2e4f1a839
Create Date: 2026-04-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


revision = "c9e3f5a2b847"
down_revision = "b7d2e4f1a839"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if "mealplan" in sa_inspect(bind).get_table_names():
        return
    op.create_table(
        "mealplan",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("goal", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("days", sa.Integer(), nullable=False, default=7),
        sa.Column("calorie_target", sa.Float(), nullable=True),
        sa.Column("dietary_restrictions", sa.String(), nullable=False, default="Ninguna"),
        sa.Column("content_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
    )


def downgrade():
    op.drop_table("mealplan")
