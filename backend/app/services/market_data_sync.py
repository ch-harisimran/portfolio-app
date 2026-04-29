from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.market_data import MutualFundNAVCache, StockPriceCache
from .mufap_scraper import fetch_mufap_data
from .psx_scraper import fetch_psx_data


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _is_stale(last_updated: datetime | None, max_age: timedelta) -> bool:
    if last_updated is None:
        return True
    if last_updated.tzinfo is None:
        last_updated = last_updated.replace(tzinfo=timezone.utc)
    return _utc_now() - last_updated >= max_age


async def ensure_stock_data(db: Session, max_age_minutes: int = 30, refresh_stale: bool = False) -> None:
    last_updated = db.query(func.max(StockPriceCache.last_updated)).scalar()
    has_rows = db.query(StockPriceCache.id).first() is not None
    should_refresh = not has_rows or (refresh_stale and _is_stale(last_updated, timedelta(minutes=max_age_minutes)))
    if should_refresh:
        await fetch_psx_data(db)


async def ensure_fund_data(db: Session, max_age_hours: int = 24) -> None:
    last_updated = db.query(func.max(MutualFundNAVCache.last_updated)).scalar()
    has_rows = db.query(MutualFundNAVCache.id).first() is not None
    if not has_rows or _is_stale(last_updated, timedelta(hours=max_age_hours)):
        await fetch_mufap_data(db)
