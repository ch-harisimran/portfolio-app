"""Add session lock table.

Revision ID: 20260427_0002
Revises: 20260427_0001
Create Date: 2026-04-28
"""
from alembic import op
import sqlalchemy as sa


revision = "20260427_0002"
down_revision = "20260427_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_locks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.String(), nullable=False),
        sa.Column("is_locked", sa.Boolean(), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_session_locks_id"), "session_locks", ["id"], unique=False)
    op.create_index(op.f("ix_session_locks_user_id"), "session_locks", ["user_id"], unique=False)
    op.create_index(op.f("ix_session_locks_device_id"), "session_locks", ["device_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_session_locks_device_id"), table_name="session_locks")
    op.drop_index(op.f("ix_session_locks_user_id"), table_name="session_locks")
    op.drop_index(op.f("ix_session_locks_id"), table_name="session_locks")
    op.drop_table("session_locks")
