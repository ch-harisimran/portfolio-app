"""Add auth device and webauthn tables.

Revision ID: 20260427_0001
Revises:
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa


revision = "20260427_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trusted_devices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.String(), nullable=False),
        sa.Column("platform", sa.String(), nullable=True),
        sa.Column("label", sa.String(), nullable=True),
        sa.Column("biometric_enabled", sa.Boolean(), nullable=True),
        sa.Column("webauthn_enabled", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trusted_devices_id"), "trusted_devices", ["id"], unique=False)
    op.create_index(op.f("ix_trusted_devices_user_id"), "trusted_devices", ["user_id"], unique=False)
    op.create_index(op.f("ix_trusted_devices_device_id"), "trusted_devices", ["device_id"], unique=False)

    op.create_table(
        "auth_challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("challenge_type", sa.String(), nullable=False),
        sa.Column("challenge", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_used", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_auth_challenges_id"), "auth_challenges", ["id"], unique=False)
    op.create_index(op.f("ix_auth_challenges_user_id"), "auth_challenges", ["user_id"], unique=False)
    op.create_index(op.f("ix_auth_challenges_challenge"), "auth_challenges", ["challenge"], unique=False)
    op.create_index(op.f("ix_auth_challenges_expires_at"), "auth_challenges", ["expires_at"], unique=False)

    op.create_table(
        "webauthn_credentials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("credential_id", sa.String(), nullable=False),
        sa.Column("public_key", sa.String(), nullable=False),
        sa.Column("counter", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_webauthn_credentials_id"), "webauthn_credentials", ["id"], unique=False)
    op.create_index(op.f("ix_webauthn_credentials_user_id"), "webauthn_credentials", ["user_id"], unique=False)
    op.create_index(op.f("ix_webauthn_credentials_credential_id"), "webauthn_credentials", ["credential_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_webauthn_credentials_credential_id"), table_name="webauthn_credentials")
    op.drop_index(op.f("ix_webauthn_credentials_user_id"), table_name="webauthn_credentials")
    op.drop_index(op.f("ix_webauthn_credentials_id"), table_name="webauthn_credentials")
    op.drop_table("webauthn_credentials")

    op.drop_index(op.f("ix_auth_challenges_expires_at"), table_name="auth_challenges")
    op.drop_index(op.f("ix_auth_challenges_challenge"), table_name="auth_challenges")
    op.drop_index(op.f("ix_auth_challenges_user_id"), table_name="auth_challenges")
    op.drop_index(op.f("ix_auth_challenges_id"), table_name="auth_challenges")
    op.drop_table("auth_challenges")

    op.drop_index(op.f("ix_trusted_devices_device_id"), table_name="trusted_devices")
    op.drop_index(op.f("ix_trusted_devices_user_id"), table_name="trusted_devices")
    op.drop_index(op.f("ix_trusted_devices_id"), table_name="trusted_devices")
    op.drop_table("trusted_devices")
