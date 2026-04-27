from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..core.database import Base


class StockInvestment(Base):
    __tablename__ = "stock_investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    company_name = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    units = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)
    buy_date = Column(Date, nullable=False)
    broker_commission = Column(Float, default=0.0)
    notes = Column(String, nullable=True)

    # Closed trade fields
    is_closed = Column(Boolean, default=False)
    sell_price = Column(Float, nullable=True)
    sell_date = Column(Date, nullable=True)
    sell_commission = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def invested_amount(self) -> float:
        return self.units * self.buy_price + self.broker_commission

    @property
    def realized_pnl(self) -> float:
        if not self.is_closed or self.sell_price is None:
            return 0.0
        return (self.sell_price - self.buy_price) * self.units - self.sell_commission
