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
    CloseStockRequest, PartialSellStockRequest, StockPriceResponse
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


@router.get("", response_model=List[StockInvestmentResponse])
@router.get("/", response_model=List[StockInvestmentResponse], include_in_schema=False)
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


@router.post("", response_model=StockInvestmentResponse, status_code=201)
@router.post("/", response_model=StockInvestmentResponse, status_code=201, include_in_schema=False)
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


@router.post("/{investment_id}/sell")
def partial_sell_stock(
    investment_id: int,
    data: PartialSellStockRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    anchor = db.query(StockInvestment).filter(
        StockInvestment.id == investment_id,
        StockInvestment.user_id == user.id,
    ).first()
    if not anchor:
        raise HTTPException(status_code=404, detail="Investment not found")
    if data.units <= 0:
        raise HTTPException(status_code=400, detail="Units must be greater than 0")

    open_trades = (
        db.query(StockInvestment)
        .filter(
            StockInvestment.user_id == user.id,
            StockInvestment.symbol == anchor.symbol,
            StockInvestment.is_closed == False,
        )
        .order_by(StockInvestment.buy_date.asc(), StockInvestment.id.asc())
        .all()
    )
    total_open_units = sum(trade.units for trade in open_trades)
    if data.units > total_open_units:
        raise HTTPException(status_code=400, detail="Not enough open units to sell")

    units_left = data.units
    affected = 0

    for trade in open_trades:
        if units_left <= 0:
            break

        sell_units = min(trade.units, units_left)
        allocated_sell_commission = data.sell_commission * (sell_units / data.units)

        if sell_units == trade.units:
            trade.is_closed = True
            trade.sell_price = data.sell_price
            trade.sell_date = data.sell_date
            trade.sell_commission = allocated_sell_commission
            if data.notes:
                trade.notes = f"{trade.notes}\n{data.notes}".strip() if trade.notes else data.notes
        else:
            original_units = trade.units
            original_buy_commission = trade.broker_commission or 0.0
            remaining_units = original_units - sell_units
            sold_buy_commission = original_buy_commission * (sell_units / original_units)
            remaining_buy_commission = original_buy_commission - sold_buy_commission

            trade.units = remaining_units
            trade.broker_commission = remaining_buy_commission

            db.add(StockInvestment(
                user_id=trade.user_id,
                symbol=trade.symbol,
                company_name=trade.company_name,
                sector=trade.sector,
                units=sell_units,
                buy_price=trade.buy_price,
                buy_date=trade.buy_date,
                broker_commission=sold_buy_commission,
                notes=data.notes or trade.notes,
                is_closed=True,
                sell_price=data.sell_price,
                sell_date=data.sell_date,
                sell_commission=allocated_sell_commission,
            ))

        units_left -= sell_units
        affected += 1

    db.commit()
    return {
        "message": f"Sold {data.units} shares of {anchor.symbol}",
        "symbol": anchor.symbol,
        "units_sold": data.units,
        "trades_affected": affected,
    }


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
