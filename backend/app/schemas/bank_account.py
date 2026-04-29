from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BankAccountCreate(BaseModel):
    bank_name: str = Field(min_length=1)
    account_title: Optional[str] = None
    account_type: Optional[str] = None
    account_number_last4: Optional[str] = Field(default=None, max_length=4)
    balance: float
    notes: Optional[str] = None


class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = Field(default=None, min_length=1)
    account_title: Optional[str] = None
    account_type: Optional[str] = None
    account_number_last4: Optional[str] = Field(default=None, max_length=4)
    balance: Optional[float] = None
    notes: Optional[str] = None


class BankAccountResponse(BaseModel):
    id: int
    bank_name: str
    account_title: Optional[str]
    account_type: Optional[str]
    account_number_last4: Optional[str]
    balance: float
    notes: Optional[str]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
