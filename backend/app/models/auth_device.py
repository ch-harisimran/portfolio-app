from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from ..core.database import Base


class TrustedDevice(Base):
    __tablename__ = "trusted_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String, nullable=False, index=True)
    platform = Column(String, nullable=True)  # web, android, ios, desktop
    label = Column(String, nullable=True)
    biometric_enabled = Column(Boolean, default=False)
    webauthn_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AuthChallenge(Base):
    __tablename__ = "auth_challenges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_type = Column(String, nullable=False)  # pin, biometric, webauthn
    challenge = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    credential_id = Column(String, nullable=False, unique=True, index=True)
    public_key = Column(String, nullable=False)
    counter = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SessionLock(Base):
    __tablename__ = "session_locks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String, nullable=False, index=True)
    is_locked = Column(Boolean, default=False)
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
