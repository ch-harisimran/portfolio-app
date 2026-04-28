from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....models.goal import Goal, GoalContribution
from ....schemas.goal import GoalCreate, GoalUpdate, GoalResponse, GoalContributionCreate, GoalContributionResponse

router = APIRouter()


def enrich_goal(goal: Goal) -> dict:
    total_saved = sum(c.amount for c in goal.contributions)
    progress = min((total_saved / goal.target_amount * 100), 100) if goal.target_amount else 0
    return {
        "id": goal.id, "name": goal.name, "description": goal.description,
        "target_amount": goal.target_amount, "deadline": goal.deadline,
        "icon": goal.icon, "color": goal.color,
        "total_saved": total_saved,
        "progress_percent": round(progress, 2),
        "remaining_amount": max(goal.target_amount - total_saved, 0),
        "contributions": [
            {"id": c.id, "goal_id": c.goal_id, "amount": c.amount, "date": c.date, "note": c.note}
            for c in sorted(goal.contributions, key=lambda x: x.date, reverse=True)
        ],
    }


@router.get("", response_model=List[GoalResponse])
@router.get("/", response_model=List[GoalResponse], include_in_schema=False)
def list_goals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.created_at.desc()).all()
    return [enrich_goal(g) for g in goals]


@router.post("", response_model=GoalResponse, status_code=201)
@router.post("/", response_model=GoalResponse, status_code=201, include_in_schema=False)
def create_goal(data: GoalCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = Goal(**data.model_dump(), user_id=user.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return enrich_goal(goal)


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(goal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return enrich_goal(goal)


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: int, data: GoalUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return enrich_goal(goal)


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()


@router.post("/{goal_id}/contributions", response_model=GoalContributionResponse, status_code=201)
def add_contribution(
    goal_id: int, data: GoalContributionCreate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    contribution = GoalContribution(**data.model_dump(), goal_id=goal_id)
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    return contribution


@router.delete("/{goal_id}/contributions/{contribution_id}", status_code=204)
def delete_contribution(
    goal_id: int, contribution_id: int,
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    contribution = db.query(GoalContribution).filter(
        GoalContribution.id == contribution_id, GoalContribution.goal_id == goal_id
    ).first()
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")
    db.delete(contribution)
    db.commit()
