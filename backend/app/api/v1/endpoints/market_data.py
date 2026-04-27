from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....services.psx_scraper import fetch_psx_data
from ....services.mufap_scraper import fetch_mufap_data

router = APIRouter()


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
