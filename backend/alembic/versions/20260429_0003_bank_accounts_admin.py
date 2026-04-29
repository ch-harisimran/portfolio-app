"""add bank accounts and admin flag

Revision ID: 20260429_0003
Revises: 20260427_0002
Create Date: 2026-04-29 00:00:03
"""

from alembic import op
import sqlalchemy as sa


revision = "20260429_0003"
down_revision = "20260427_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_table(
        "bank_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("bank_name", sa.String(), nullable=False),
        sa.Column("account_title", sa.String(), nullable=True),
        sa.Column("account_type", sa.String(), nullable=True),
        sa.Column("account_number_last4", sa.String(length=4), nullable=True),
        sa.Column("balance", sa.Float(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bank_accounts_id"), "bank_accounts", ["id"], unique=False)
    op.create_index(op.f("ix_bank_accounts_user_id"), "bank_accounts", ["user_id"], unique=False)
    op.create_index(op.f("ix_bank_accounts_bank_name"), "bank_accounts", ["bank_name"], unique=False)

    op.execute(
        """
        UPDATE users
        SET is_admin = TRUE
        WHERE id = (
            SELECT id
            FROM users
            ORDER BY created_at ASC NULLS LAST, id ASC
            LIMIT 1
        )
        """
    )
    op.alter_column("users", "is_admin", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_bank_accounts_bank_name"), table_name="bank_accounts")
    op.drop_index(op.f("ix_bank_accounts_user_id"), table_name="bank_accounts")
    op.drop_index(op.f("ix_bank_accounts_id"), table_name="bank_accounts")
    op.drop_table("bank_accounts")
    op.drop_column("users", "is_admin")
