from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date


class LoanCreate(BaseModel):
    lender_name: str
    description: Optional[str] = None
    principal_amount: float
    interest_rate: float = 0.0
    start_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("due_date", mode="before")
    @classmethod
    def empty_due_date_to_none(cls, v):
        if v == "":
            return None
        return v

    @field_validator("description", "notes", mode="before")
    @classmethod
    def empty_text_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v


class LoanUpdate(BaseModel):
    lender_name: Optional[str] = None
    description: Optional[str] = None
    principal_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None


class LoanRepaymentCreate(BaseModel):
    amount: float
    date: date
    note: Optional[str] = None


class LoanRepaymentResponse(BaseModel):
    id: int
    loan_id: int
    amount: float
    date: date
    note: Optional[str]

    class Config:
        from_attributes = True


class LoanResponse(BaseModel):
    id: int
    lender_name: str
    description: Optional[str]
    principal_amount: float
    interest_rate: float
    start_date: date
    due_date: Optional[date]
    notes: Optional[str]
    total_paid: float
    remaining_balance: float
    progress_percent: float
    repayments: List[LoanRepaymentResponse] = []

    class Config:
        from_attributes = True
