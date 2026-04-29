from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....models.mutual_fund import MutualFundInvestment
from ....models.market_data import MutualFundNAVCache
from ....services.market_data_sync import ensure_fund_data
from ....schemas.mutual_fund import (
    MutualFundCreate, MutualFundUpdate, MutualFundResponse,
    CloseMutualFundRequest, MutualFundNAVResponse, ManualFundNAVUpdateRequest
)

router = APIRouter()


def enrich_fund(inv: MutualFundInvestment, db: Session) -> dict:
    data = {
        "id": inv.id, "fund_name": inv.fund_name, "amc_name": inv.amc_name,
        "fund_type": inv.fund_type, "units": inv.units, "purchase_nav": inv.purchase_nav,
        "purchase_date": inv.purchase_date, "load_percentage": inv.load_percentage,
        "notes": inv.notes, "is_closed": inv.is_closed,
        "sell_nav": inv.sell_nav, "sell_date": inv.sell_date,
        "invested_amount": inv.invested_amount,
        "realized_pnl": inv.realized_pnl if inv.is_closed else None,
        "current_nav": None, "current_value": None,
        "unrealized_pnl": None, "unrealized_pnl_pct": None,
    }
    if not inv.is_closed:
        cache = db.query(MutualFundNAVCache).filter(
            MutualFundNAVCache.fund_name == inv.fund_name
        ).first()
        if cache and cache.current_nav:
            data["current_nav"] = cache.current_nav
            data["current_value"] = inv.units * cache.current_nav
            data["unrealized_pnl"] = data["current_value"] - inv.invested_amount
            data["unrealized_pnl_pct"] = (data["unrealized_pnl"] / inv.invested_amount * 100) if inv.invested_amount else 0
    return data


@router.get("", response_model=List[MutualFundResponse])
@router.get("/", response_model=List[MutualFundResponse], include_in_schema=False)
async def list_funds(
    is_closed: Optional[bool] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        await ensure_fund_data(db)
    except Exception:
        pass
    q = db.query(MutualFundInvestment).filter(MutualFundInvestment.user_id == user.id)
    if is_closed is not None:
        q = q.filter(MutualFundInvestment.is_closed == is_closed)
    investments = q.order_by(MutualFundInvestment.purchase_date.desc()).all()
    return [enrich_fund(inv, db) for inv in investments]


@router.post("", response_model=MutualFundResponse, status_code=201)
@router.post("/", response_model=MutualFundResponse, status_code=201, include_in_schema=False)
def create_fund(data: MutualFundCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = MutualFundInvestment(**data.model_dump(), user_id=user.id)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return enrich_fund(inv, db)


@router.get("/{investment_id}", response_model=MutualFundResponse)
async def get_fund(investment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        await ensure_fund_data(db)
    except Exception:
        pass
    inv = db.query(MutualFundInvestment).filter(
        MutualFundInvestment.id == investment_id, MutualFundInvestment.user_id == user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    return enrich_fund(inv, db)


@router.patch("/{investment_id}", response_model=MutualFundResponse)
def update_fund(
    investment_id: int, data: MutualFundUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    inv = db.query(MutualFundInvestment).filter(
        MutualFundInvestment.id == investment_id, MutualFundInvestment.user_id == user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return enrich_fund(inv, db)


@router.post("/{investment_id}/close", response_model=MutualFundResponse)
def close_fund(
    investment_id: int, data: CloseMutualFundRequest,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    inv = db.query(MutualFundInvestment).filter(
        MutualFundInvestment.id == investment_id, MutualFundInvestment.user_id == user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    if inv.is_closed:
        raise HTTPException(status_code=400, detail="Investment already closed")
    inv.is_closed = True
    inv.sell_nav = data.sell_nav
    inv.sell_date = data.sell_date
    db.commit()
    db.refresh(inv)
    return enrich_fund(inv, db)


@router.delete("/{investment_id}", status_code=204)
def delete_fund(investment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = db.query(MutualFundInvestment).filter(
        MutualFundInvestment.id == investment_id, MutualFundInvestment.user_id == user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    db.delete(inv)
    db.commit()


@router.post("/manual-nav")
def set_manual_nav(
    data: ManualFundNAVUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.current_nav <= 0:
        raise HTTPException(status_code=400, detail="Current NAV must be greater than 0")

    cache = db.query(MutualFundNAVCache).filter(
        MutualFundNAVCache.fund_name == data.fund_name
    ).first()

    if cache:
        cache.current_nav = data.current_nav
        if data.amc_name:
            cache.amc_name = data.amc_name
        if data.fund_type:
            cache.fund_type = data.fund_type
        if data.nav_date:
            cache.nav_date = data.nav_date
    else:
        db.add(MutualFundNAVCache(
            fund_name=data.fund_name,
            amc_name=data.amc_name,
            fund_type=data.fund_type,
            current_nav=data.current_nav,
            nav_date=data.nav_date,
        ))

    db.commit()
    return {"message": "Manual NAV updated"}


@router.get("/search/mufap", response_model=List[MutualFundNAVResponse])
async def search_funds(q: str = Query("", min_length=0), db: Session = Depends(get_db)):
    try:
        await ensure_fund_data(db)
    except Exception:
        pass
    query = db.query(MutualFundNAVCache)
    if q:
        query = query.filter(
            (MutualFundNAVCache.fund_name.ilike(f"%{q}%")) |
            (MutualFundNAVCache.amc_name.ilike(f"%{q}%"))
        )
    results = query.order_by(MutualFundNAVCache.amc_name, MutualFundNAVCache.fund_name).all()
    return results
