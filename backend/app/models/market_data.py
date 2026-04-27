from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from sqlalchemy.sql import func
from ..core.database import Base


class StockPriceCache(Base):
    __tablename__ = "stock_price_cache"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True, nullable=False)
    company_name = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    current_price = Column(Float, nullable=True)
    open_price = Column(Float, nullable=True)
    high_price = Column(Float, nullable=True)
    low_price = Column(Float, nullable=True)
    prev_close = Column(Float, nullable=True)
    change = Column(Float, nullable=True)
    change_percent = Column(Float, nullable=True)
    volume = Column(Float, nullable=True)
    market_cap = Column(Float, nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MutualFundNAVCache(Base):
    __tablename__ = "mutual_fund_nav_cache"

    id = Column(Integer, primary_key=True, index=True)
    fund_name = Column(String, unique=True, index=True, nullable=False)
    amc_name = Column(String, nullable=True)
    fund_type = Column(String, nullable=True)
    current_nav = Column(Float, nullable=True)
    nav_date = Column(String, nullable=True)
    offer_price = Column(Float, nullable=True)
    redemption_price = Column(Float, nullable=True)
    week_52_high = Column(Float, nullable=True)
    week_52_low = Column(Float, nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
