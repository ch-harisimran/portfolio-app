from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class MutualFundCreate(BaseModel):
    fund_name: str
    amc_name: Optional[str] = None
    fund_type: Optional[str] = None
    units: float
    purchase_nav: float
    purchase_date: date
    load_percentage: float = 0.0
    notes: Optional[str] = None


class MutualFundUpdate(BaseModel):
    units: Optional[float] = None
    purchase_nav: Optional[float] = None
    purchase_date: Optional[date] = None
    load_percentage: Optional[float] = None
    notes: Optional[str] = None


class CloseMutualFundRequest(BaseModel):
    sell_nav: float
    sell_date: date


class ManualFundNAVUpdateRequest(BaseModel):
    fund_name: str
    current_nav: float
    amc_name: Optional[str] = None
    fund_type: Optional[str] = None
    nav_date: Optional[str] = None


class MutualFundResponse(BaseModel):
    id: int
    fund_name: str
    amc_name: Optional[str]
    fund_type: Optional[str]
    units: float
    purchase_nav: float
    purchase_date: date
    load_percentage: float
    notes: Optional[str]
    is_closed: bool
    sell_nav: Optional[float]
    sell_date: Optional[date]
    invested_amount: float
    current_nav: Optional[float] = None
    current_value: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_pct: Optional[float] = None
    realized_pnl: Optional[float] = None

    class Config:
        from_attributes = True


class MutualFundNAVResponse(BaseModel):
    fund_name: str
    amc_name: Optional[str]
    fund_type: Optional[str]
    current_nav: Optional[float]
    nav_date: Optional[str]
    offer_price: Optional[float]
    redemption_price: Optional[float]
    last_updated: Optional[datetime]

    class Config:
        from_attributes = True
