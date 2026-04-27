from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....models.loan import Loan, LoanRepayment
from ....schemas.loan import LoanCreate, LoanUpdate, LoanResponse, LoanRepaymentCreate, LoanRepaymentResponse

router = APIRouter()


def enrich_loan(loan: Loan) -> dict:
    total_paid = sum(r.amount for r in loan.repayments)
    remaining = max(loan.principal_amount - total_paid, 0)
    progress = min((total_paid / loan.principal_amount * 100), 100) if loan.principal_amount else 0
    return {
        "id": loan.id, "lender_name": loan.lender_name, "description": loan.description,
        "principal_amount": loan.principal_amount, "interest_rate": loan.interest_rate,
        "start_date": loan.start_date, "due_date": loan.due_date, "notes": loan.notes,
        "total_paid": total_paid,
        "remaining_balance": remaining,
        "progress_percent": round(progress, 2),
        "repayments": [
            {"id": r.id, "loan_id": r.loan_id, "amount": r.amount, "date": r.date, "note": r.note}
            for r in sorted(loan.repayments, key=lambda x: x.date, reverse=True)
        ],
    }


@router.get("/", response_model=List[LoanResponse])
def list_loans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loans = db.query(Loan).filter(Loan.user_id == user.id).order_by(Loan.start_date.desc()).all()
    return [enrich_loan(l) for l in loans]


@router.post("/", response_model=LoanResponse, status_code=201)
def create_loan(data: LoanCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = Loan(**data.model_dump(), user_id=user.id)
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return enrich_loan(loan)


@router.get("/{loan_id}", response_model=LoanResponse)
def get_loan(loan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.user_id == user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return enrich_loan(loan)


@router.patch("/{loan_id}", response_model=LoanResponse)
def update_loan(loan_id: int, data: LoanUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.user_id == user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(loan, field, value)
    db.commit()
    db.refresh(loan)
    return enrich_loan(loan)


@router.delete("/{loan_id}", status_code=204)
def delete_loan(loan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.user_id == user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    db.delete(loan)
    db.commit()


@router.post("/{loan_id}/repayments", response_model=LoanRepaymentResponse, status_code=201)
def add_repayment(
    loan_id: int, data: LoanRepaymentCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.user_id == user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    repayment = LoanRepayment(**data.model_dump(), loan_id=loan_id)
    db.add(repayment)
    db.commit()
    db.refresh(repayment)
    return repayment


@router.delete("/{loan_id}/repayments/{repayment_id}", status_code=204)
def delete_repayment(
    loan_id: int, repayment_id: int,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.user_id == user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    repayment = db.query(LoanRepayment).filter(
        LoanRepayment.id == repayment_id, LoanRepayment.loan_id == loan_id
    ).first()
    if not repayment:
        raise HTTPException(status_code=404, detail="Repayment not found")
    db.delete(repayment)
    db.commit()
