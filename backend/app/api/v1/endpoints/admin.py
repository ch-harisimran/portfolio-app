from sqlalchemy import func
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException

from ....core.database import get_db
from ....core.security import get_current_admin, is_admin_email
from ....models.bank_account import BankAccount
from ....models.expense import IncomeEntry
from ....models.goal import Goal
from ....models.loan import Loan
from ....models.mutual_fund import MutualFundInvestment
from ....models.stock_investment import StockInvestment
from ....models.user import User
from ....schemas.admin import AdminDeleteUserResponse, AdminUserSummary

router = APIRouter()


@router.get("/users", response_model=list[AdminUserSummary])
def list_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc(), User.id.desc()).all()
    results: list[AdminUserSummary] = []
    for user in users:
        results.append(
            AdminUserSummary(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                is_admin=bool(user.is_admin or is_admin_email(user.email)),
                created_at=user.created_at,
                stock_count=db.query(func.count(StockInvestment.id)).filter(StockInvestment.user_id == user.id).scalar() or 0,
                mutual_fund_count=db.query(func.count(MutualFundInvestment.id)).filter(MutualFundInvestment.user_id == user.id).scalar() or 0,
                goal_count=db.query(func.count(Goal.id)).filter(Goal.user_id == user.id).scalar() or 0,
                loan_count=db.query(func.count(Loan.id)).filter(Loan.user_id == user.id).scalar() or 0,
                expense_income_count=db.query(func.count(IncomeEntry.id)).filter(IncomeEntry.user_id == user.id).scalar() or 0,
                bank_account_count=db.query(func.count(BankAccount.id)).filter(BankAccount.user_id == user.id).scalar() or 0,
            )
        )
    return results


@router.delete("/users/{user_id}", response_model=AdminDeleteUserResponse)
def delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")

    deleted_email = user.email
    db.delete(user)
    db.commit()
    return AdminDeleteUserResponse(
        deleted_user_id=user_id,
        deleted_email=deleted_email,
        message="User and related data deleted",
    )
