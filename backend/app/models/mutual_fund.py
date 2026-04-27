from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..core.database import Base


class MutualFundInvestment(Base):
    __tablename__ = "mutual_fund_investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    fund_name = Column(String, nullable=False, index=True)
    amc_name = Column(String, nullable=True)
    fund_type = Column(String, nullable=True)  # equity, debt, money market, balanced, etc.
    units = Column(Float, nullable=False)
    purchase_nav = Column(Float, nullable=False)
    purchase_date = Column(Date, nullable=False)
    load_percentage = Column(Float, default=0.0)
    notes = Column(String, nullable=True)

    # Closed investment fields
    is_closed = Column(Boolean, default=False)
    sell_nav = Column(Float, nullable=True)
    sell_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def invested_amount(self) -> float:
        cost = self.units * self.purchase_nav
        return cost + (cost * self.load_percentage / 100)

    @property
    def realized_pnl(self) -> float:
        if not self.is_closed or self.sell_nav is None:
            return 0.0
        return (self.sell_nav - self.purchase_nav) * self.units
