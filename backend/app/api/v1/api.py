from fastapi import APIRouter
from .endpoints import auth, stocks, mutual_funds, goals, loans, dashboard, settings, market_data, expenses, reports

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["Stocks"])
api_router.include_router(mutual_funds.router, prefix="/mutual-funds", tags=["Mutual Funds"])
api_router.include_router(goals.router, prefix="/goals", tags=["Goals"])
api_router.include_router(loans.router, prefix="/loans", tags=["Loans"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(market_data.router, prefix="/market-data", tags=["Market Data"])
