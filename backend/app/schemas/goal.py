from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class GoalCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_amount: float
    deadline: Optional[date] = None
    icon: str = "target"
    color: str = "#3b82f6"


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[float] = None
    deadline: Optional[date] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class GoalContributionCreate(BaseModel):
    amount: float
    date: date
    note: Optional[str] = None


class GoalContributionResponse(BaseModel):
    id: int
    goal_id: int
    amount: float
    date: date
    note: Optional[str]

    class Config:
        from_attributes = True


class GoalResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    target_amount: float
    deadline: Optional[date]
    icon: str
    color: str
    total_saved: float
    progress_percent: float
    remaining_amount: float
    contributions: List[GoalContributionResponse] = []

    class Config:
        from_attributes = True
