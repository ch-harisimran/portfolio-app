from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class StockInvestmentCreate(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    units: float
    buy_price: float
    buy_date: date
    broker_commission: float = 0.0
    notes: Optional[str] = None


class StockInvestmentUpdate(BaseModel):
    units: Optional[float] = None
    buy_price: Optional[float] = None
    buy_date: Optional[date] = None
    broker_commission: Optional[float] = None
    notes: Optional[str] = None


class CloseStockRequest(BaseModel):
    sell_price: float
    sell_date: date
    sell_commission: float = 0.0


class PartialSellStockRequest(BaseModel):
    units: float
    sell_price: float
    sell_date: date
    sell_commission: float = 0.0
    notes: Optional[str] = None


class StockInvestmentResponse(BaseModel):
    id: int
    symbol: str
    company_name: Optional[str]
    sector: Optional[str]
    units: float
    buy_price: float
    buy_date: date
    broker_commission: float
    notes: Optional[str]
    is_closed: bool
    sell_price: Optional[float]
    sell_date: Optional[date]
    sell_commission: float
    invested_amount: float
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_pct: Optional[float] = None
    realized_pnl: Optional[float] = None

    class Config:
        from_attributes = True


class StockPriceResponse(BaseModel):
    symbol: str
    company_name: Optional[str]
    sector: Optional[str]
    current_price: Optional[float]
    open_price: Optional[float]
    high_price: Optional[float]
    low_price: Optional[float]
    prev_close: Optional[float]
    change: Optional[float]
    change_percent: Optional[float]
    volume: Optional[float]
    last_updated: Optional[datetime]

    class Config:
        from_attributes = True
