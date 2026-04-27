from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....schemas.auth import UserResponse

router = APIRouter()


class UpdateSettingsRequest(BaseModel):
    full_name: Optional[str] = None
    theme: Optional[str] = None
    currency: Optional[str] = None


@router.patch("/", response_model=UserResponse)
def update_settings(
    data: UpdateSettingsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.theme is not None:
        user.theme = data.theme
    if data.currency is not None:
        user.currency = data.currency
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id, email=user.email, full_name=user.full_name,
        theme=user.theme, currency=user.currency, has_pin=bool(user.pin_hash),
    )
