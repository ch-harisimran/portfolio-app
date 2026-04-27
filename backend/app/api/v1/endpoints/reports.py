from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, datetime
from io import BytesIO
from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....models.stock_investment import StockInvestment
from ....models.mutual_fund import MutualFundInvestment
from ....models.goal import Goal, GoalContribution
from ....models.loan import Loan, LoanRepayment
from ....models.expense import IncomeEntry, ExpenseEntry
from ....schemas.report import ReportsOverviewResponse, ModuleReportSummary, CategorySlice, ExportRequest

router = APIRouter()


def _in_date_range(d: date, start: date | None, end: date | None) -> bool:
    if start and d < start:
        return False
    if end and d > end:
        return False
    return True


def _parse_range(mode: str, month: str | None, year: int | None, start_date: str | None, end_date: str | None):
    if mode == "month":
        if not month:
            raise HTTPException(status_code=400, detail="Month is required")
        y, m = month.split("-")
        start = date(int(y), int(m), 1)
        if int(m) == 12:
            end = date(int(y) + 1, 1, 1)
        else:
            end = date(int(y), int(m) + 1, 1)
        return start, end, month
    if mode == "year":
        if not year:
            raise HTTPException(status_code=400, detail="Year is required")
        return date(year, 1, 1), date(year + 1, 1, 1), str(year)
    if mode == "custom":
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Custom range requires start_date and end_date")
        s = datetime.strptime(start_date, "%Y-%m-%d").date()
        e = datetime.strptime(end_date, "%Y-%m-%d").date()
        return s, e, f"{start_date} to {end_date}"
    return None, None, "All time"


@router.get("/overview", response_model=ReportsOverviewResponse)
def reports_overview(
    filter_mode: str = "all",
    month: str | None = None,
    year: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    start, end_exclusive, label = _parse_range(filter_mode, month, year, start_date, end_date)
    end_inclusive = end_exclusive and (end_exclusive - date.resolution)

    modules: list[ModuleReportSummary] = []

    stocks = db.query(StockInvestment).filter(StockInvestment.user_id == user.id).all()
    sector_totals: dict[str, float] = {}
    total_stocks = 0.0
    for s in stocks:
        if start and end_inclusive and not _in_date_range(s.buy_date, start, end_inclusive):
            continue
        amt = s.invested_amount
        key = s.sector or "Uncategorized"
        sector_totals[key] = sector_totals.get(key, 0) + amt
        total_stocks += amt
    modules.append(ModuleReportSummary(
        module="stocks",
        total=round(total_stocks, 2),
        categories=[CategorySlice(name=k, value=round(v, 2)) for k, v in sorted(sector_totals.items())],
    ))

    funds = db.query(MutualFundInvestment).filter(MutualFundInvestment.user_id == user.id).all()
    fund_totals: dict[str, float] = {}
    total_funds = 0.0
    for f in funds:
        if start and end_inclusive and not _in_date_range(f.purchase_date, start, end_inclusive):
            continue
        amt = f.invested_amount
        key = f.fund_type or f.amc_name or "Uncategorized"
        fund_totals[key] = fund_totals.get(key, 0) + amt
        total_funds += amt
    modules.append(ModuleReportSummary(
        module="mutual_funds",
        total=round(total_funds, 2),
        categories=[CategorySlice(name=k, value=round(v, 2)) for k, v in sorted(fund_totals.items())],
    ))

    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    goal_totals: dict[str, float] = {}
    total_goals = 0.0
    for g in goals:
        for c in g.contributions:
            if start and end_inclusive and not _in_date_range(c.date, start, end_inclusive):
                continue
            goal_totals[g.name] = goal_totals.get(g.name, 0) + c.amount
            total_goals += c.amount
    modules.append(ModuleReportSummary(
        module="goals",
        total=round(total_goals, 2),
        categories=[CategorySlice(name=k, value=round(v, 2)) for k, v in sorted(goal_totals.items())],
    ))

    loans = db.query(Loan).filter(Loan.user_id == user.id).all()
    lender_totals: dict[str, float] = {}
    total_repaid = 0.0
    for l in loans:
        for r in l.repayments:
            if start and end_inclusive and not _in_date_range(r.date, start, end_inclusive):
                continue
            lender = l.lender_name or "Uncategorized"
            lender_totals[lender] = lender_totals.get(lender, 0) + r.amount
            total_repaid += r.amount
    modules.append(ModuleReportSummary(
        module="loans",
        total=round(total_repaid, 2),
        categories=[CategorySlice(name=k, value=round(v, 2)) for k, v in sorted(lender_totals.items())],
    ))

    expenses = db.query(ExpenseEntry).filter(ExpenseEntry.user_id == user.id).all()
    expense_totals: dict[str, float] = {}
    total_expense = 0.0
    for e in expenses:
        if start and end_inclusive and not _in_date_range(e.date, start, end_inclusive):
            continue
        key = e.category or "Uncategorized"
        expense_totals[key] = expense_totals.get(key, 0) + e.amount
        total_expense += e.amount
    modules.append(ModuleReportSummary(
        module="expenses",
        total=round(total_expense, 2),
        categories=[CategorySlice(name=k, value=round(v, 2)) for k, v in sorted(expense_totals.items())],
    ))

    return ReportsOverviewResponse(range_label=label, modules=modules)


@router.post("/export/pdf")
def export_pdf(
    payload: ExportRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    start, end_exclusive, label = _parse_range(payload.filter_mode, payload.month, payload.year, payload.start_date, payload.end_date)
    end_inclusive = end_exclusive and (end_exclusive - date.resolution)
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 40
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "PakFinance Export")
    y -= 20
    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"User: {user.email}")
    y -= 14
    c.drawString(40, y, f"Range: {label}")
    y -= 20

    def line(txt: str):
        nonlocal y
        if y < 60:
            c.showPage()
            y = h - 40
            c.setFont("Helvetica", 10)
        c.drawString(40, y, txt)
        y -= 14

    if payload.include_stocks:
        line("Stocks:")
        stocks = db.query(StockInvestment).filter(StockInvestment.user_id == user.id).all()
        for s in stocks:
            if start and end_inclusive and not _in_date_range(s.buy_date, start, end_inclusive):
                continue
            line(f"  {s.buy_date} - {s.symbol} - {s.invested_amount:.2f}")
    if payload.include_mutual_funds:
        line("Mutual Funds:")
        rows = db.query(MutualFundInvestment).filter(MutualFundInvestment.user_id == user.id).all()
        for r in rows:
            if start and end_inclusive and not _in_date_range(r.purchase_date, start, end_inclusive):
                continue
            line(f"  {r.purchase_date} - {r.fund_name} - {r.invested_amount:.2f}")
    if payload.include_goals:
        line("Goals Contributions:")
        rows = db.query(GoalContribution).join(Goal, Goal.id == GoalContribution.goal_id).filter(Goal.user_id == user.id).all()
        for r in rows:
            if start and end_inclusive and not _in_date_range(r.date, start, end_inclusive):
                continue
            line(f"  {r.date} - Goal#{r.goal_id} - {r.amount:.2f}")
    if payload.include_loans:
        line("Loan Repayments:")
        rows = db.query(LoanRepayment).join(Loan, Loan.id == LoanRepayment.loan_id).filter(Loan.user_id == user.id).all()
        for r in rows:
            if start and end_inclusive and not _in_date_range(r.date, start, end_inclusive):
                continue
            line(f"  {r.date} - Loan#{r.loan_id} - {r.amount:.2f}")
    if payload.include_expenses:
        line("Expenses:")
        rows = db.query(ExpenseEntry).filter(ExpenseEntry.user_id == user.id).all()
        for r in rows:
            if start and end_inclusive and not _in_date_range(r.date, start, end_inclusive):
                continue
            line(f"  {r.date} - {r.category} - {r.amount:.2f}")
    if payload.include_summary or payload.include_dashboard:
        overview = reports_overview(payload.filter_mode, payload.month, payload.year, payload.start_date, payload.end_date, user, db)
        line("Summary:")
        for mod in overview.modules:
            line(f"  {mod.module}: {mod.total:.2f}")

    c.save()
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=pakfinance-export.pdf"},
    )
