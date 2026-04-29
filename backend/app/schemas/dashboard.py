from pydantic import BaseModel
from typing import List, Optional


class NetWorthItem(BaseModel):
    date: str
    value: float


class DashboardSummary(BaseModel):
    total_net_worth: float
    total_invested: float
    stocks_value: float
    mutual_funds_value: float
    bank_holdings_value: float
    stocks_invested: float
    mutual_funds_invested: float
    total_goals_saved: float
    total_loans_remaining: float
    realized_pnl: float
    unrealized_pnl: float
    total_pnl: float
    total_pnl_percent: float
    portfolio_history: List[NetWorthItem]


class AllocationItem(BaseModel):
    name: str
    value: float
    percent: float
    color: str


class PeriodSummaryItem(BaseModel):
    period: str
    stocks_invested: float
    mutual_funds_invested: float
    goals_saved: float
    loans_repaid: float
    total: float


class PeriodSummaryResponse(BaseModel):
    monthly: List[PeriodSummaryItem]
    yearly: List[PeriodSummaryItem]
