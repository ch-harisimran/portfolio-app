from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....core.security import get_current_user
from ....models.bank_account import BankAccount
from ....models.user import User
from ....schemas.bank_account import BankAccountCreate, BankAccountResponse, BankAccountUpdate

router = APIRouter()


@router.get("", response_model=List[BankAccountResponse])
@router.get("/", response_model=List[BankAccountResponse], include_in_schema=False)
def list_bank_accounts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(BankAccount)
        .filter(BankAccount.user_id == user.id)
        .order_by(BankAccount.balance.desc(), BankAccount.id.desc())
        .all()
    )


@router.post("", response_model=BankAccountResponse, status_code=201)
@router.post("/", response_model=BankAccountResponse, status_code=201, include_in_schema=False)
def create_bank_account(
    data: BankAccountCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = BankAccount(**data.model_dump(), user_id=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{account_id}", response_model=BankAccountResponse)
def update_bank_account(
    account_id: int,
    data: BankAccountUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(BankAccount).filter(
        BankAccount.id == account_id,
        BankAccount.user_id == user.id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Bank account not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{account_id}", status_code=204)
def delete_bank_account(
    account_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(BankAccount).filter(
        BankAccount.id == account_id,
        BankAccount.user_id == user.id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Bank account not found")
    db.delete(row)
    db.commit()
