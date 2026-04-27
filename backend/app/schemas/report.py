from pydantic import BaseModel
from typing import List


class CategorySlice(BaseModel):
    name: str
    value: float


class ModuleReportSummary(BaseModel):
    module: str
    total: float
    categories: List[CategorySlice]


class ReportsOverviewResponse(BaseModel):
    range_label: str
    modules: List[ModuleReportSummary]


class ExportRequest(BaseModel):
    include_dashboard: bool = False
    include_stocks: bool = False
    include_mutual_funds: bool = False
    include_goals: bool = False
    include_loans: bool = False
    include_expenses: bool = False
    include_summary: bool = False
    filter_mode: str = "all"  # all|month|year|custom
    month: str | None = None  # YYYY-MM
    year: int | None = None
    start_date: str | None = None
    end_date: str | None = None
