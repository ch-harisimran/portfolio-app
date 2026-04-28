from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from ....core.database import get_db
from ....core.config import settings
from ....core.security import get_current_user
from ....models.user import User
from ....services.psx_scraper import fetch_psx_data
from ....services.mufap_scraper import fetch_mufap_data

router = APIRouter()


def _authorize_cron(authorization: str | None) -> None:
    if not settings.CRON_SECRET or authorization != f"Bearer {settings.CRON_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/refresh/psx")
async def refresh_psx(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    await fetch_psx_data(db)
    return {"message": "PSX data refreshed"}


@router.post("/refresh/mufap")
async def refresh_mufap(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    await fetch_mufap_data(db)
    return {"message": "MUFAP data refreshed"}


@router.get("/cron/psx")
async def refresh_psx_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _authorize_cron(authorization)
    await fetch_psx_data(db)
    return {"message": "PSX data refreshed"}


@router.get("/cron/mufap")
async def refresh_mufap_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _authorize_cron(authorization)
    await fetch_mufap_data(db)
    return {"message": "MUFAP data refreshed"}
