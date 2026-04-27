from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class IncomeEntry(Base):
    __tablename__ = "income_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    income_type = Column(String, nullable=False, index=True)
    source_name = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False, index=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    expenses = relationship("ExpenseEntry", back_populates="income", cascade="all, delete-orphan")


class ExpenseEntry(Base):
    __tablename__ = "expense_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    income_id = Column(Integer, ForeignKey("income_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False, index=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    income = relationship("IncomeEntry", back_populates="expenses")
