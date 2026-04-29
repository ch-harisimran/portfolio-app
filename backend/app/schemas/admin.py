from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AdminUserSummary(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: Optional[datetime] = None
    stock_count: int
    mutual_fund_count: int
    goal_count: int
    loan_count: int
    expense_income_count: int
    bank_account_count: int


class AdminDeleteUserResponse(BaseModel):
    deleted_user_id: int
    deleted_email: str
    message: str
