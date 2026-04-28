from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets
import base64
from ....core.database import get_db
from ....core.config import settings
from ....core.security import (
    hash_password, verify_password, hash_pin, verify_pin,
    create_access_token, create_refresh_token, decode_token, get_current_user
)
from ....models.user import User
from ....models.auth_device import TrustedDevice, AuthChallenge, WebAuthnCredential, SessionLock
from ....schemas.auth import (
    LoginRequest, RegisterRequest, TokenResponse, RefreshRequest,
    UserResponse, SetPinRequest, ChangePinRequest, PinLoginRequest
)
from ....schemas.auth_device import (
    TrustedDeviceUpsertRequest,
    AuthChallengeCreateRequest,
    PublicAuthChallengeCreateRequest,
    AuthChallengeResponse,
    PinUnlockRequest,
    BiometricUnlockRequest,
    WebAuthnRegisterRequest,
    WebAuthnRegisterOptionsResponse,
    WebAuthnRegisterVerifyRequest,
    WebAuthnUnlockRequest,
    SessionLockRequest,
    SessionLockStatusRequest,
    SessionLockStatusResponse,
)

router = APIRouter()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _resolve_webauthn_context(request: Request) -> tuple[str, str]:
    forwarded_host = request.headers.get("x-forwarded-host")
    host_header = forwarded_host or request.headers.get("host") or request.url.netloc
    host = (host_header or "localhost").split(":")[0]
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"

    origin = settings.WEBAUTHN_ORIGIN
    rp_id = settings.WEBAUTHN_RP_ID

    if not origin or origin == "http://localhost:3000":
        origin = f"{proto}://{host_header or host}"
    if not rp_id or rp_id == "localhost":
        rp_id = host

    return rp_id, origin


def _upsert_lock(db: Session, user_id: int, device_id: str) -> SessionLock:
    row = db.query(SessionLock).filter(
        SessionLock.user_id == user_id,
        SessionLock.device_id == device_id,
    ).first()
    if not row:
        row = SessionLock(user_id=user_id, device_id=device_id, is_locked=False, last_activity_at=_utc_now())
        db.add(row)
        db.flush()
    return row


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        password_hash = hash_password(data.password)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Password must be between 8 and 72 characters",
        )
    user = User(
        email=data.email,
        password_hash=password_hash,
        full_name=data.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/pin-login", response_model=TokenResponse)
def pin_login(data: PinLoginRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verify PIN and return new tokens (call with short-lived access token)."""
    if not user.pin_hash:
        raise HTTPException(status_code=400, detail="PIN not set")
    if not verify_pin(data.pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/pin-unlock", response_model=TokenResponse)
def pin_unlock(data: PinUnlockRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.pin_hash:
        raise HTTPException(status_code=401, detail="PIN unlock not available")
    if not verify_pin(data.pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    if data.challenge_id:
        challenge = db.query(AuthChallenge).filter(
            AuthChallenge.id == data.challenge_id,
            AuthChallenge.user_id == user.id,
            AuthChallenge.challenge_type == "pin",
            AuthChallenge.is_used == False,
        ).first()
        if not challenge or challenge.expires_at < _utc_now():
            raise HTTPException(status_code=401, detail="Challenge expired")
        challenge.is_used = True
        db.commit()

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/devices")
def upsert_device(data: TrustedDeviceUpsertRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(TrustedDevice).filter(
        TrustedDevice.user_id == user.id,
        TrustedDevice.device_id == data.device_id,
    ).first()
    if row:
        row.platform = data.platform or row.platform
        row.label = data.label or row.label
        row.biometric_enabled = data.biometric_enabled
        row.webauthn_enabled = data.webauthn_enabled
    else:
        row = TrustedDevice(
            user_id=user.id,
            device_id=data.device_id,
            platform=data.platform,
            label=data.label,
            biometric_enabled=data.biometric_enabled,
            webauthn_enabled=data.webauthn_enabled,
        )
        db.add(row)
    db.commit()
    return {"message": "Device saved"}


@router.post("/challenge", response_model=AuthChallengeResponse)
def create_challenge(data: AuthChallengeCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    challenge_value = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
    expiry = _utc_now() + timedelta(minutes=5)
    row = AuthChallenge(
        user_id=user.id,
        challenge_type=data.challenge_type,
        challenge=challenge_value,
        expires_at=expiry,
        is_used=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return AuthChallengeResponse(
        challenge_id=row.id,
        challenge=row.challenge,
        challenge_type=row.challenge_type,
        expires_in_seconds=300,
    )


@router.post("/challenge/public", response_model=AuthChallengeResponse)
def create_public_challenge(data: PublicAuthChallengeCreateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found")
    challenge_value = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
    expiry = _utc_now() + timedelta(minutes=5)
    row = AuthChallenge(
        user_id=user.id,
        challenge_type=data.challenge_type,
        challenge=challenge_value,
        expires_at=expiry,
        is_used=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return AuthChallengeResponse(
        challenge_id=row.id,
        challenge=row.challenge,
        challenge_type=row.challenge_type,
        expires_in_seconds=300,
    )


@router.post("/biometric-unlock", response_model=TokenResponse)
def biometric_unlock(data: BiometricUnlockRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    challenge = db.query(AuthChallenge).filter(
        AuthChallenge.id == data.challenge_id,
        AuthChallenge.user_id == user.id,
        AuthChallenge.challenge_type == "biometric",
        AuthChallenge.is_used == False,
    ).first()
    if not challenge or challenge.expires_at < _utc_now():
        raise HTTPException(status_code=401, detail="Challenge expired")

    # Baseline verification: ensure assertion is non-empty and device is trusted.
    trusted = db.query(TrustedDevice).filter(
        TrustedDevice.user_id == user.id,
        TrustedDevice.device_id == (data.device_id or ""),
        TrustedDevice.biometric_enabled == True,
    ).first()
    if not trusted or not data.assertion:
        raise HTTPException(status_code=401, detail="Biometric verification failed")

    challenge.is_used = True
    if data.device_id:
        lock = _upsert_lock(db, user.id, data.device_id)
        lock.is_locked = False
        lock.last_activity_at = _utc_now()
        lock.locked_at = None
    db.commit()
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/webauthn/register")
def register_webauthn_credential(data: WebAuthnRegisterRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.credential_id == data.credential_id
    ).first()
    if existing:
        existing.public_key = data.public_key
    else:
        db.add(WebAuthnCredential(
            user_id=user.id,
            credential_id=data.credential_id,
            public_key=data.public_key,
        ))
    db.commit()
    return {"message": "WebAuthn credential saved"}


@router.post("/webauthn/register/options", response_model=WebAuthnRegisterOptionsResponse)
def webauthn_register_options(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rp_id, _ = _resolve_webauthn_context(request)
    challenge_value = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
    expiry = _utc_now() + timedelta(minutes=5)
    row = AuthChallenge(
        user_id=user.id,
        challenge_type="webauthn_register",
        challenge=challenge_value,
        expires_at=expiry,
        is_used=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return WebAuthnRegisterOptionsResponse(
        challenge_id=row.id,
        challenge=row.challenge,
        rp_id=rp_id,
        rp_name=settings.WEBAUTHN_RP_NAME,
        user_id=str(user.id),
        user_name=user.email,
        user_display_name=user.full_name or user.email,
    )


@router.post("/webauthn/register/verify")
def webauthn_register_verify(
    data: WebAuthnRegisterVerifyRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rp_id, origin = _resolve_webauthn_context(request)
    challenge = db.query(AuthChallenge).filter(
        AuthChallenge.id == data.challenge_id,
        AuthChallenge.user_id == user.id,
        AuthChallenge.challenge_type == "webauthn_register",
        AuthChallenge.is_used == False,
    ).first()
    if not challenge or challenge.expires_at < _utc_now():
        raise HTTPException(status_code=401, detail="Challenge expired")

    try:
        from webauthn import verify_registration_response
        from webauthn.helpers.structs import RegistrationCredential
        verification = verify_registration_response(
            credential=RegistrationCredential.model_validate(data.credential),
            expected_challenge=base64.urlsafe_b64decode(challenge.challenge + "==="),
            expected_rp_id=rp_id,
            expected_origin=origin,
            require_user_verification=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"WebAuthn registration verification failed: {exc}")

    credential_id = base64.urlsafe_b64encode(verification.credential_id).decode().rstrip("=")
    public_key = base64.urlsafe_b64encode(verification.credential_public_key).decode().rstrip("=")
    existing = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.credential_id == credential_id
    ).first()
    if existing:
        existing.public_key = public_key
        existing.counter = verification.sign_count
        existing.user_id = user.id
    else:
        db.add(WebAuthnCredential(
            user_id=user.id,
            credential_id=credential_id,
            public_key=public_key,
            counter=verification.sign_count,
        ))
    challenge.is_used = True
    db.commit()
    return {"message": "WebAuthn registered"}


@router.post("/webauthn-unlock", response_model=TokenResponse)
def webauthn_unlock(data: WebAuthnUnlockRequest, request: Request, db: Session = Depends(get_db)):
    rp_id, origin = _resolve_webauthn_context(request)
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    challenge = db.query(AuthChallenge).filter(
        AuthChallenge.id == data.challenge_id,
        AuthChallenge.user_id == user.id,
        AuthChallenge.challenge_type == "webauthn",
        AuthChallenge.is_used == False,
    ).first()
    credential = db.query(WebAuthnCredential).filter(
        WebAuthnCredential.user_id == user.id,
        WebAuthnCredential.credential_id == data.credential_id,
    ).first()
    if not challenge or challenge.expires_at < _utc_now():
        raise HTTPException(status_code=401, detail="Challenge expired")
    if not credential:
        raise HTTPException(status_code=401, detail="WebAuthn verification failed")

    try:
        from webauthn import verify_authentication_response
        from webauthn.helpers.structs import AuthenticationCredential
        verification = verify_authentication_response(
            credential=AuthenticationCredential.model_validate({
                "id": data.credential_id,
                "rawId": data.credential_id,
                "response": {
                    "authenticatorData": data.authenticator_data,
                    "clientDataJSON": data.client_data_json,
                    "signature": data.signature,
                    "userHandle": data.user_handle,
                },
                "type": "public-key",
            }),
            expected_challenge=base64.urlsafe_b64decode(challenge.challenge + "==="),
            expected_rp_id=rp_id,
            expected_origin=origin,
            credential_public_key=base64.urlsafe_b64decode(credential.public_key + "==="),
            credential_current_sign_count=credential.counter or 0,
            require_user_verification=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"WebAuthn verification failed: {exc}")

    challenge.is_used = True
    credential.counter = verification.new_sign_count
    db.commit()
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/session-lock/ping")
def session_ping(data: SessionLockRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lock = _upsert_lock(db, user.id, data.device_id)
    lock.last_activity_at = _utc_now()
    db.commit()
    return {"message": "ok"}


@router.post("/session-lock/lock")
def lock_session(data: SessionLockRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lock = _upsert_lock(db, user.id, data.device_id)
    lock.is_locked = True
    lock.locked_at = _utc_now()
    db.commit()
    return {"message": "locked"}


@router.post("/session-lock/status", response_model=SessionLockStatusResponse)
def session_lock_status(data: SessionLockStatusRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return SessionLockStatusResponse(is_locked=True)
    lock = db.query(SessionLock).filter(
        SessionLock.user_id == user.id,
        SessionLock.device_id == data.device_id,
    ).first()
    return SessionLockStatusResponse(is_locked=bool(lock and lock.is_locked))


@router.post("/session-lock/unlock")
def unlock_session(data: SessionLockStatusRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    lock = _upsert_lock(db, user.id, data.device_id)
    lock.is_locked = False
    lock.last_activity_at = _utc_now()
    lock.locked_at = None
    db.commit()
    return {"message": "unlocked"}


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshRequest):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = payload.get("sub")
    return TokenResponse(
        access_token=create_access_token({"sub": user_id}),
        refresh_token=create_refresh_token({"sub": user_id}),
    )


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        theme=user.theme,
        currency=user.currency,
        has_pin=bool(user.pin_hash),
    )


@router.post("/set-pin")
def set_pin(data: SetPinRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if len(data.pin) < 4:
        raise HTTPException(status_code=400, detail="PIN must be at least 4 digits")
    user.pin_hash = hash_pin(data.pin)
    db.commit()
    return {"message": "PIN set successfully"}


@router.post("/change-pin")
def change_pin(data: ChangePinRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.pin_hash or not verify_pin(data.current_pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    if len(data.new_pin) < 4:
        raise HTTPException(status_code=400, detail="PIN must be at least 4 digits")
    user.pin_hash = hash_pin(data.new_pin)
    db.commit()
    return {"message": "PIN changed successfully"}
