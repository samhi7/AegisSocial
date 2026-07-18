from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Prediction, Feedback
from ..schemas import (
    PredictRequest, PredictionResult, BatchPredictRequest, BatchPredictResponse,
    FeedbackCreate, FeedbackResponse
)
from ..auth_utils import get_current_user
from ..moderation_utils import moderator

router = APIRouter(tags=["Moderation"])

@router.post("/predict", response_model=PredictionResult)
def predict_toxicity(request: PredictRequest):
    results = moderator.moderate_text(request.text)
    return results

@router.post("/batch_predict", response_model=BatchPredictResponse)
def batch_predict_toxicity(request: BatchPredictRequest):
    predictions = []
    for text in request.texts:
        res = moderator.moderate_text(text)
        predictions.append(res)
    return {"predictions": predictions}

@router.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(
    feedback_in: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify prediction exists
    prediction = db.query(Prediction).filter(Prediction.id == feedback_in.prediction_id).first()
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction record not found"
        )

    # Check if feedback already exists for this prediction
    existing_feedback = db.query(Feedback).filter(Feedback.prediction_id == feedback_in.prediction_id).first()
    if existing_feedback:
        # Update existing feedback
        existing_feedback.is_correct = feedback_in.is_correct
        existing_feedback.reason = feedback_in.reason
        existing_feedback.comment = feedback_in.comment
        db.commit()
        db.refresh(existing_feedback)
        return existing_feedback

    # Create new feedback record
    new_feedback = Feedback(
        prediction_id=feedback_in.prediction_id,
        user_id=current_user.id,
        is_correct=feedback_in.is_correct,
        reason=feedback_in.reason,
        comment=feedback_in.comment
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    return new_feedback
