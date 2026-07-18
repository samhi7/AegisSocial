from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, Comment, BlockedComment, Prediction, Post
from ..schemas import CommentCreate, CommentResponse
from ..auth_utils import get_current_user
from ..moderation_utils import moderator
import datetime

router = APIRouter(tags=["Comments"])

@router.post("/create_comment")
def create_comment(
    post_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    text = comment_in.content.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    # Run AI Moderation
    mod_results = moderator.moderate_text(text)
    decision = mod_results["final_decision"]

    # 1. Blocked flow (> 0.75)
    if decision == "block":
        # Save to BlockedComments table
        blocked_comment = BlockedComment(post_id=post_id, user_id=current_user.id, content=text)
        db.add(blocked_comment)
        db.commit()
        db.refresh(blocked_comment)

        # Save prediction
        prediction = Prediction(
            user_id=current_user.id,
            content_type="comment",
            content_id=blocked_comment.id,
            original_text=text,
            baseline_prob=mod_results["baseline_prob"],
            baseline_pred=mod_results["baseline_pred"],
            distilbert_prob=mod_results["distilbert_prob"],
            distilbert_pred=mod_results["distilbert_pred"],
            final_decision="block"
        )
        db.add(prediction)
        db.commit()

        return {
            "status": "blocked",
            "message": "This comment violates community guidelines and has been blocked.",
            "prediction": {
                "baseline_prob": mod_results["baseline_prob"],
                "distilbert_prob": mod_results["distilbert_prob"],
                "final_decision": "block"
            }
        }

    # 2. Warning flow (0.40 - 0.75)
    elif decision == "warning" and not comment_in.bypass_warning:
        return {
            "status": "warning",
            "message": "This comment may be offensive. Do you still want to post?",
            "prediction": {
                "baseline_prob": mod_results["baseline_prob"],
                "distilbert_prob": mod_results["distilbert_prob"],
                "final_decision": "warning"
            }
        }

    # 3. Publish flow (clean or bypassed warning)
    new_comment = Comment(post_id=post_id, user_id=current_user.id, content=text)
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    # Save prediction
    prediction = Prediction(
        user_id=current_user.id,
        content_type="comment",
        content_id=new_comment.id,
        original_text=text,
        baseline_prob=mod_results["baseline_prob"],
        baseline_pred=mod_results["baseline_pred"],
        distilbert_prob=mod_results["distilbert_prob"],
        distilbert_pred=mod_results["distilbert_pred"],
        final_decision=decision
    )
    db.add(prediction)
    db.commit()

    return {
        "status": "published",
        "comment_id": new_comment.id,
        "message": "Comment published successfully."
    }

@router.get("/get_comments", response_model=List[CommentResponse])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    # Verify post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.asc()).all()
    
    response_comments = []
    for comment in comments:
        pred = db.query(Prediction).filter(
            Prediction.content_type == "comment",
            Prediction.content_id == comment.id
        ).first()

        response_comments.append({
            "id": comment.id,
            "post_id": comment.post_id,
            "user_id": comment.user_id,
            "content": comment.content,
            "created_at": comment.created_at,
            "owner": comment.owner,
            "prediction": pred
        })
        
    return response_comments

@router.delete("/delete_comment/{comment_id}")
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        # Check BlockedComments
        comment = db.query(BlockedComment).filter(BlockedComment.id == comment_id).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    # Delete prediction
    db.query(Prediction).filter(
        Prediction.content_type == "comment",
        Prediction.content_id == comment_id
    ).delete()

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted successfully"}
