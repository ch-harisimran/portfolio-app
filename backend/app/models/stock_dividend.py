from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..core.database import Base


class StockDividend(Base):
    __tablename__ = "stock_dividends"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    shares = Column(Float, nullable=False)
    dividend_per_share = Column(Float, nullable=False)
    tax_percent = Column(Float, default=0.0)
    dividend_date = Column(Date, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def gross_amount(self) -> float:
        return self.shares * self.dividend_per_share

    @property
    def tax_amount(self) -> float:
        return self.gross_amount * (self.tax_percent / 100)

    @property
    def net_amount(self) -> float:
        return self.gross_amount - self.tax_amount
