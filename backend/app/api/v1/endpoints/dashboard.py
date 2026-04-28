from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta
from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....models.stock_investment import StockInvestment
from ....models.mutual_fund import MutualFundInvestment
from ....models.goal import Goal, GoalContribution
from ....models.loan import Loan, LoanRepayment
from ....models.market_data import StockPriceCache, MutualFundNAVCache
from ....services.market_data_sync import ensure_fund_data, ensure_stock_data
from ....schemas.dashboard import (
    DashboardSummary, NetWorthItem, AllocationItem,
    PeriodSummaryItem, PeriodSummaryResponse,
)
from typing import List

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    await ensure_stock_data(db)
    await ensure_fund_data(db)
    # Active stocks
    active_stocks = db.query(StockInvestment).filter(
        StockInvestment.user_id == user.id, StockInvestment.is_closed == False
    ).all()
    closed_stocks = db.query(StockInvestment).filter(
        StockInvestment.user_id == user.id, StockInvestment.is_closed == True
    ).all()

    # Active mutual funds
    active_funds = db.query(MutualFundInvestment).filter(
        MutualFundInvestment.user_id == user.id, MutualFundInvestment.is_closed == False
    ).all()
    closed_funds = db.query(MutualFundInvestment).filter(
        MutualFundInvestment.user_id == user.id, MutualFundInvestment.is_closed == True
    ).all()

    # Calculate stocks
    stocks_invested = sum(s.invested_amount for s in active_stocks)
    stocks_current = 0.0
    for s in active_stocks:
        cache = db.query(StockPriceCache).filter(StockPriceCache.symbol == s.symbol).first()
        if cache and cache.current_price:
            stocks_current += s.units * cache.current_price
        else:
            stocks_current += s.invested_amount

    # Calculate mutual funds
    funds_invested = sum(f.invested_amount for f in active_funds)
    funds_current = 0.0
    for f in active_funds:
        cache = db.query(MutualFundNAVCache).filter(MutualFundNAVCache.fund_name == f.fund_name).first()
        if cache and cache.current_nav:
            funds_current += f.units * cache.current_nav
        else:
            funds_current += f.invested_amount

    # PnL
    unrealized_pnl = (stocks_current - stocks_invested) + (funds_current - funds_invested)
    realized_pnl = sum(s.realized_pnl for s in closed_stocks) + sum(f.realized_pnl for f in closed_funds)
    total_pnl = unrealized_pnl + realized_pnl
    total_invested = stocks_invested + funds_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested else 0

    # Goals
    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    total_goals = sum(sum(c.amount for c in g.contributions) for g in goals)

    # Loans
    loans = db.query(Loan).filter(Loan.user_id == user.id).all()
    total_loans_remaining = sum(
        max(l.principal_amount - sum(r.amount for r in l.repayments), 0)
        for l in loans
    )

    total_net_worth = (stocks_current + funds_current + total_goals) - total_loans_remaining

    # Build portfolio history (last 30 days approximation)
    history = _build_history(total_invested, total_net_worth)

    return DashboardSummary(
        total_net_worth=round(total_net_worth, 2),
        total_invested=round(total_invested, 2),
        stocks_value=round(stocks_current, 2),
        mutual_funds_value=round(funds_current, 2),
        stocks_invested=round(stocks_invested, 2),
        mutual_funds_invested=round(funds_invested, 2),
        total_goals_saved=round(total_goals, 2),
        total_loans_remaining=round(total_loans_remaining, 2),
        realized_pnl=round(realized_pnl, 2),
        unrealized_pnl=round(unrealized_pnl, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_percent=round(total_pnl_pct, 2),
        portfolio_history=history,
    )


def _build_history(invested: float, current: float) -> List[NetWorthItem]:
    """Simple linear interpolation for demo; replace with real snapshots."""
    items = []
    today = date.today()
    for i in range(30, -1, -1):
        d = today - timedelta(days=i)
        ratio = (30 - i) / 30
        value = invested + (current - invested) * ratio
        items.append(NetWorthItem(date=d.isoformat(), value=round(value, 2)))
    return items


@router.get("/allocation", response_model=List[AllocationItem])
def get_allocation(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    active_stocks = db.query(StockInvestment).filter(
        StockInvestment.user_id == user.id, StockInvestment.is_closed == False
    ).all()
    active_funds = db.query(MutualFundInvestment).filter(
        MutualFundInvestment.user_id == user.id, MutualFundInvestment.is_closed == False
    ).all()

    stocks_val = sum(s.invested_amount for s in active_stocks)
    funds_val = sum(f.invested_amount for f in active_funds)
    total = stocks_val + funds_val

    items = []
    if total > 0:
        if stocks_val > 0:
            items.append(AllocationItem(name="PSX Stocks", value=round(stocks_val, 2),
                                        percent=round(stocks_val / total * 100, 1), color="#3b82f6"))
        if funds_val > 0:
            items.append(AllocationItem(name="Mutual Funds", value=round(funds_val, 2),
                                        percent=round(funds_val / total * 100, 1), color="#10b981"))
    return items


@router.get("/period-summary", response_model=PeriodSummaryResponse)
def get_period_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    monthly_map: dict[str, dict] = {}

    def ensure_month(month_key: str):
        if month_key not in monthly_map:
            monthly_map[month_key] = {
                "stocks_invested": 0.0,
                "mutual_funds_invested": 0.0,
                "goals_saved": 0.0,
                "loans_repaid": 0.0,
            }

    stock_rows = db.query(StockInvestment).filter(StockInvestment.user_id == user.id).all()
    for row in stock_rows:
        key = row.buy_date.strftime("%Y-%m")
        ensure_month(key)
        monthly_map[key]["stocks_invested"] += row.invested_amount

    fund_rows = db.query(MutualFundInvestment).filter(MutualFundInvestment.user_id == user.id).all()
    for row in fund_rows:
        key = row.purchase_date.strftime("%Y-%m")
        ensure_month(key)
        monthly_map[key]["mutual_funds_invested"] += row.invested_amount

    goal_rows = (
        db.query(GoalContribution)
        .join(Goal, Goal.id == GoalContribution.goal_id)
        .filter(Goal.user_id == user.id)
        .all()
    )
    for row in goal_rows:
        key = row.date.strftime("%Y-%m")
        ensure_month(key)
        monthly_map[key]["goals_saved"] += row.amount

    loan_rows = (
        db.query(LoanRepayment)
        .join(Loan, Loan.id == LoanRepayment.loan_id)
        .filter(Loan.user_id == user.id)
        .all()
    )
    for row in loan_rows:
        key = row.date.strftime("%Y-%m")
        ensure_month(key)
        monthly_map[key]["loans_repaid"] += row.amount

    monthly_items: list[PeriodSummaryItem] = []
    for period in sorted(monthly_map.keys()):
        r = monthly_map[period]
        total = r["stocks_invested"] + r["mutual_funds_invested"] + r["goals_saved"] + r["loans_repaid"]
        monthly_items.append(PeriodSummaryItem(
            period=period,
            stocks_invested=round(r["stocks_invested"], 2),
            mutual_funds_invested=round(r["mutual_funds_invested"], 2),
            goals_saved=round(r["goals_saved"], 2),
            loans_repaid=round(r["loans_repaid"], 2),
            total=round(total, 2),
        ))

    yearly_map: dict[str, dict] = {}
    for row in monthly_items:
        year = row.period[:4]
        if year not in yearly_map:
            yearly_map[year] = {
                "stocks_invested": 0.0,
                "mutual_funds_invested": 0.0,
                "goals_saved": 0.0,
                "loans_repaid": 0.0,
            }
        yearly_map[year]["stocks_invested"] += row.stocks_invested
        yearly_map[year]["mutual_funds_invested"] += row.mutual_funds_invested
        yearly_map[year]["goals_saved"] += row.goals_saved
        yearly_map[year]["loans_repaid"] += row.loans_repaid

    yearly_items: list[PeriodSummaryItem] = []
    for year in sorted(yearly_map.keys()):
        r = yearly_map[year]
        total = r["stocks_invested"] + r["mutual_funds_invested"] + r["goals_saved"] + r["loans_repaid"]
        yearly_items.append(PeriodSummaryItem(
            period=year,
            stocks_invested=round(r["stocks_invested"], 2),
            mutual_funds_invested=round(r["mutual_funds_invested"], 2),
            goals_saved=round(r["goals_saved"], 2),
            loans_repaid=round(r["loans_repaid"], 2),
            total=round(total, 2),
        ))

    return PeriodSummaryResponse(monthly=monthly_items, yearly=yearly_items)
