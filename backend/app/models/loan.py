from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lender_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    principal_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, default=0.0)  # annual percentage
    start_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    repayments = relationship("LoanRepayment", back_populates="loan", cascade="all, delete-orphan")


class LoanRepayment(Base):
    __tablename__ = "loan_repayments"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    loan = relationship("Loan", back_populates="repayments")
