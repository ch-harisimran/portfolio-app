from pydantic import BaseModel
from typing import Optional, Literal, Any


class TrustedDeviceUpsertRequest(BaseModel):
    device_id: str
    platform: Optional[str] = None
    label: Optional[str] = None
    biometric_enabled: bool = False
    webauthn_enabled: bool = False


class AuthChallengeCreateRequest(BaseModel):
    challenge_type: Literal["pin", "biometric", "webauthn"]
    device_id: Optional[str] = None


class PublicAuthChallengeCreateRequest(BaseModel):
    email: str
    challenge_type: Literal["pin", "biometric", "webauthn"]
    device_id: Optional[str] = None


class AuthChallengeResponse(BaseModel):
    challenge_id: int
    challenge: str
    challenge_type: str
    expires_in_seconds: int


class PinUnlockRequest(BaseModel):
    email: str
    pin: str
    challenge_id: Optional[int] = None


class BiometricUnlockRequest(BaseModel):
    email: str
    challenge_id: int
    assertion: str
    device_id: Optional[str] = None


class WebAuthnRegisterRequest(BaseModel):
    credential_id: str
    public_key: str


class WebAuthnRegisterOptionsResponse(BaseModel):
    challenge_id: int
    challenge: str
    rp_id: str
    rp_name: str
    user_id: str
    user_name: str
    user_display_name: str


class WebAuthnRegisterVerifyRequest(BaseModel):
    challenge_id: int
    credential: dict[str, Any]


class WebAuthnUnlockRequest(BaseModel):
    email: str
    challenge_id: int
    credential_id: str
    authenticator_data: str
    client_data_json: str
    signature: str
    user_handle: Optional[str] = None


class SessionLockRequest(BaseModel):
    device_id: str


class SessionLockStatusRequest(BaseModel):
    email: str
    device_id: str


class SessionLockStatusResponse(BaseModel):
    is_locked: bool
