from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....models.stock_investment import StockInvestment
from ....models.market_data import StockPriceCache
from ....services.market_data_sync import ensure_stock_data
from ....schemas.stock import (
    StockInvestmentCreate, StockInvestmentUpdate, StockInvestmentResponse,
    CloseStockRequest, StockPriceResponse
)

router = APIRouter()


def enrich_stock(inv: StockInvestment, db: Session) -> dict:
    data = {
        "id": inv.id, "symbol": inv.symbol, "company_name": inv.company_name,
        "sector": inv.sector, "units": inv.units, "buy_price": inv.buy_price,
        "buy_date": inv.buy_date, "broker_commission": inv.broker_commission,
        "notes": inv.notes, "is_closed": inv.is_closed,
        "sell_price": inv.sell_price, "sell_date": inv.sell_date,
        "sell_commission": inv.sell_commission,
        "invested_amount": inv.invested_amount,
        "realized_pnl": inv.realized_pnl if inv.is_closed else None,
        "current_price": None, "current_value": None,
        "unrealized_pnl": None, "unrealized_pnl_pct": None,
    }
    if not inv.is_closed:
        cache = db.query(StockPriceCache).filter(StockPriceCache.symbol == inv.symbol).first()
        if cache and cache.current_price:
            data["current_price"] = cache.current_price
            data["current_value"] = inv.units * cache.current_price
            data["unrealized_pnl"] = data["current_value"] - inv.invested_amount
            data["unrealized_pnl_pct"] = (data["unrealized_pnl"] / inv.invested_amount * 100) if inv.invested_amount else 0
    return data


@router.get("/", response_model=List[StockInvestmentResponse])
async def list_stocks(
    is_closed: Optional[bool] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    await ensure_stock_data(db)
    q = db.query(StockInvestment).filter(StockInvestment.user_id == user.id)
    if is_closed is not None:
        q = q.filter(StockInvestment.is_closed == is_closed)
    investments = q.order_by(StockInvestment.buy_date.desc()).all()
    return [enrich_stock(inv, db) for inv in investments]


@router.post("/", response_model=StockInvestmentResponse, status_code=201)
def create_stock(data: StockInvestmentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = StockInvestment(**data.model_dump(), user_id=user.id)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return enrich_stock(inv, db)


@router.get("/{investment_id}", response_model=StockInvestmentResponse)
async def get_stock(investment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    await ensure_stock_data(db)
    inv = db.query(StockInvestment).filter(
        StockInvestment.id == investment_id, StockInvestment.user_id == user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    return enrich_stock(inv, db)


@router.patch("/{investment_id}", response_model=StockInvestmentResponse)
def update_stock(
    investment_id: int, data: StockInvestmentUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    inv = db.query(StockInvestment).filter(
        StockInvestment.id == investment_id, StockInvestment.user_id == user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return enrich_stock(inv, db)


@router.post("/{investment_id}/close", response_model=StockInvestmentResponse)
def close_stock(
    investment_id: int, data: CloseStockRequest,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    inv = db.query(StockInvestment).filter(
        StockInvestment.id == investment_id, StockInvestment.user_id == user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    if inv.is_closed:
        raise HTTPException(status_code=400, detail="Investment already closed")
    inv.is_closed = True
    inv.sell_price = data.sell_price
    inv.sell_date = data.sell_date
    inv.sell_commission = data.sell_commission
    db.commit()
    db.refresh(inv)
    return enrich_stock(inv, db)


@router.delete("/{investment_id}", status_code=204)
def delete_stock(investment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = db.query(StockInvestment).filter(
        StockInvestment.id == investment_id, StockInvestment.user_id == user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    db.delete(inv)
    db.commit()


@router.get("/search/psx", response_model=List[StockPriceResponse])
async def search_psx_stocks(q: str = Query("", min_length=0), db: Session = Depends(get_db)):
    await ensure_stock_data(db)
    query = db.query(StockPriceCache)
    if q:
        query = query.filter(
            (StockPriceCache.symbol.ilike(f"%{q}%")) |
            (StockPriceCache.company_name.ilike(f"%{q}%"))
        )
    results = query.order_by(StockPriceCache.symbol).all()
    return results
