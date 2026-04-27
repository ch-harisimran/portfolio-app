from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....models.expense import IncomeEntry, ExpenseEntry
from ....schemas.expense import (
    IncomeCreate, IncomeResponse, ExpenseCreate, ExpenseResponse,
    ExpenseSummaryResponse, ExpensePeriodSummaryItem,
)

router = APIRouter()


def enrich_income(row: IncomeEntry) -> dict:
    expenses = sorted(row.expenses, key=lambda x: x.date, reverse=True)
    total_expense = sum(e.amount for e in expenses)
    return {
        "id": row.id,
        "income_type": row.income_type,
        "source_name": row.source_name,
        "amount": row.amount,
        "date": row.date,
        "note": row.note,
        "total_expense": round(total_expense, 2),
        "remaining": round(row.amount - total_expense, 2),
        "expenses": [
            {
                "id": e.id,
                "income_id": e.income_id,
                "category": e.category,
                "amount": e.amount,
                "date": e.date,
                "note": e.note,
            }
            for e in expenses
        ],
    }


@router.get("/incomes", response_model=list[IncomeResponse])
def list_incomes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(IncomeEntry)
        .filter(IncomeEntry.user_id == user.id)
        .order_by(IncomeEntry.date.desc(), IncomeEntry.id.desc())
        .all()
    )
    return [enrich_income(r) for r in rows]


@router.post("/incomes", response_model=IncomeResponse, status_code=201)
def create_income(data: IncomeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Income amount must be greater than 0")
    row = IncomeEntry(**data.model_dump(), user_id=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return enrich_income(row)


@router.delete("/incomes/{income_id}", status_code=204)
def delete_income(income_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(IncomeEntry)
        .filter(IncomeEntry.id == income_id, IncomeEntry.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Income entry not found")
    db.delete(row)
    db.commit()


@router.post("/incomes/{income_id}/expenses", response_model=ExpenseResponse, status_code=201)
def add_expense(
    income_id: int,
    data: ExpenseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Expense amount must be greater than 0")
    income = (
        db.query(IncomeEntry)
        .filter(IncomeEntry.id == income_id, IncomeEntry.user_id == user.id)
        .first()
    )
    if not income:
        raise HTTPException(status_code=404, detail="Income entry not found")
    row = ExpenseEntry(**data.model_dump(), user_id=user.id, income_id=income_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(ExpenseEntry)
        .filter(ExpenseEntry.id == expense_id, ExpenseEntry.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    db.delete(row)
    db.commit()


@router.get("/summary", response_model=ExpenseSummaryResponse)
def get_expense_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    monthly_map: dict[str, dict] = {}

    def ensure_month(month_key: str):
        if month_key not in monthly_map:
            monthly_map[month_key] = {"income_total": 0.0, "expense_total": 0.0}

    incomes = db.query(IncomeEntry).filter(IncomeEntry.user_id == user.id).all()
    for row in incomes:
        key = row.date.strftime("%Y-%m")
        ensure_month(key)
        monthly_map[key]["income_total"] += row.amount

    expenses = db.query(ExpenseEntry).filter(ExpenseEntry.user_id == user.id).all()
    for row in expenses:
        key = row.date.strftime("%Y-%m")
        ensure_month(key)
        monthly_map[key]["expense_total"] += row.amount

    monthly_items: list[ExpensePeriodSummaryItem] = []
    for period in sorted(monthly_map.keys()):
        income_total = monthly_map[period]["income_total"]
        expense_total = monthly_map[period]["expense_total"]
        monthly_items.append(
            ExpensePeriodSummaryItem(
                period=period,
                income_total=round(income_total, 2),
                expense_total=round(expense_total, 2),
                net_savings=round(income_total - expense_total, 2),
            )
        )

    yearly_map: dict[str, dict] = {}
    for row in monthly_items:
        year = row.period[:4]
        if year not in yearly_map:
            yearly_map[year] = {"income_total": 0.0, "expense_total": 0.0}
        yearly_map[year]["income_total"] += row.income_total
        yearly_map[year]["expense_total"] += row.expense_total

    yearly_items: list[ExpensePeriodSummaryItem] = []
    for year in sorted(yearly_map.keys()):
        income_total = yearly_map[year]["income_total"]
        expense_total = yearly_map[year]["expense_total"]
        yearly_items.append(
            ExpensePeriodSummaryItem(
                period=year,
                income_total=round(income_total, 2),
                expense_total=round(expense_total, 2),
                net_savings=round(income_total - expense_total, 2),
            )
        )

    return ExpenseSummaryResponse(monthly=monthly_items, yearly=yearly_items)
