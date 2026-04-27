from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date


class IncomeCreate(BaseModel):
    income_type: str
    source_name: Optional[str] = None
    amount: float
    date: date
    note: Optional[str] = None

    @field_validator("source_name", "note", mode="before")
    @classmethod
    def empty_text_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v


class ExpenseCreate(BaseModel):
    category: str
    amount: float
    date: date
    note: Optional[str] = None

    @field_validator("note", mode="before")
    @classmethod
    def empty_note_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v


class ExpenseResponse(BaseModel):
    id: int
    income_id: int
    category: str
    amount: float
    date: date
    note: Optional[str]

    class Config:
        from_attributes = True


class IncomeResponse(BaseModel):
    id: int
    income_type: str
    source_name: Optional[str]
    amount: float
    date: date
    note: Optional[str]
    total_expense: float
    remaining: float
    expenses: List[ExpenseResponse] = []


class ExpensePeriodSummaryItem(BaseModel):
    period: str
    income_total: float
    expense_total: float
    net_savings: float


class ExpenseSummaryResponse(BaseModel):
    monthly: List[ExpensePeriodSummaryItem]
    yearly: List[ExpensePeriodSummaryItem]
