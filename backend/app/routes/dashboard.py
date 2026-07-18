from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from ..database import get_db
from ..models import User, Post, BlockedPost, Comment, BlockedComment, Prediction, Feedback, Like
from ..schemas import UserDashboardResponse, AdminDashboardResponse
from ..auth_utils import get_current_user
import datetime

router = APIRouter(tags=["Dashboards"])

def calc_confidence(pred_val: int, prob_val: float) -> float:
    # Confidence is the probability of the predicted class:
    # If prediction is 1, confidence is prob_val. If prediction is 0, confidence is 1 - prob_val.
    if pred_val == 1:
        return prob_val
    else:
        return 1.0 - prob_val

@router.get("/user_dashboard", response_model=UserDashboardResponse)
def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch all predictions for this user
    predictions = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()
    
    # Blocked content
    blocked_posts = db.query(BlockedPost).filter(BlockedPost.user_id == current_user.id).order_by(BlockedPost.created_at.desc()).all()
    blocked_comments = db.query(BlockedComment).filter(BlockedComment.user_id == current_user.id).order_by(BlockedComment.created_at.desc()).all()
    
    # Counts
    total_posts = db.query(Post).filter(Post.user_id == current_user.id).count() + len(blocked_posts)
    total_comments = db.query(Comment).filter(Comment.user_id == current_user.id).count() + len(blocked_comments)
    
    toxic_posts = 0
    toxic_comments = 0
    warning_count = 0
    blocked_count = len(blocked_posts) + len(blocked_comments)
    
    agreements = 0
    disagreements = 0
    lr_toxic = 0
    db_toxic = 0
    
    lr_conf_sum = 0.0
    db_conf_sum = 0.0
    
    comparison_list = []
    
    for pred in predictions:
        # Check toxic status
        if pred.content_type == "post" and pred.distilbert_pred == 1:
            toxic_posts += 1
        elif pred.content_type == "comment" and pred.distilbert_pred == 1:
            toxic_comments += 1
            
        if pred.final_decision == "warning":
            warning_count += 1
            
        # Agreement
        if pred.baseline_pred == pred.distilbert_pred:
            agreements += 1
        else:
            disagreements += 1
            
        if pred.baseline_pred == 1:
            lr_toxic += 1
        if pred.distilbert_pred == 1:
            db_toxic += 1
            
        lr_conf = calc_confidence(pred.baseline_pred, pred.baseline_prob)
        db_conf = calc_confidence(pred.distilbert_pred, pred.distilbert_prob)
        lr_conf_sum += lr_conf
        db_conf_sum += db_conf

        # Check for feedback
        fb = db.query(Feedback).filter(Feedback.prediction_id == pred.id).first()
        fb_dict = None
        if fb:
            fb_dict = {
                "id": fb.id,
                "prediction_id": fb.prediction_id,
                "user_id": fb.user_id,
                "is_correct": fb.is_correct,
                "reason": fb.reason,
                "comment": fb.comment,
                "timestamp": fb.timestamp
            }

        comparison_list.append({
            "id": pred.id,
            "content_type": pred.content_type,
            "text": pred.original_text,
            "baseline_prob": pred.baseline_prob,
            "baseline_pred": pred.baseline_pred,
            "distilbert_prob": pred.distilbert_prob,
            "distilbert_pred": pred.distilbert_pred,
            "final_decision": pred.final_decision,
            "timestamp": pred.timestamp,
            "feedback": fb_dict
        })
        
    total_moderated = len(predictions)
    agreement_rate = (agreements / total_moderated * 100) if total_moderated > 0 else 100.0
    disagreement_rate = (disagreements / total_moderated * 100) if total_moderated > 0 else 0.0
    
    lr_avg_conf = (lr_conf_sum / total_moderated) if total_moderated > 0 else 0.0
    db_avg_conf = (db_conf_sum / total_moderated) if total_moderated > 0 else 0.0
    
    total_items = total_posts + total_comments
    total_toxic = toxic_posts + toxic_comments
    
    clean_pct = ((total_items - total_toxic) / total_items * 100) if total_items > 0 else 100.0
    toxic_pct = (total_toxic / total_items * 100) if total_items > 0 else 0.0
    
    blocked_posts_formatted = [{"id": bp.id, "content": bp.content, "created_at": bp.created_at} for bp in blocked_posts]
    blocked_comments_formatted = [{"id": bc.id, "post_id": bc.post_id, "content": bc.content, "created_at": bc.created_at} for bc in blocked_comments]

    return {
        "stats": {
            "total_posts": total_posts,
            "total_comments": total_comments,
            "toxic_posts": toxic_posts,
            "toxic_comments": toxic_comments,
            "warning_count": warning_count,
            "blocked_count": blocked_count,
            "clean_percentage": clean_pct,
            "toxic_percentage": toxic_pct
        },
        "agreement": {
            "agreement_rate": agreement_rate,
            "disagreement_count": disagreements,
            "disagreement_rate": disagreement_rate,
            "logistic_regression_toxic_count": lr_toxic,
            "distilbert_toxic_count": db_toxic,
            "logistic_regression_avg_confidence": lr_avg_conf,
            "distilbert_avg_confidence": db_avg_conf
        },
        "comparison": comparison_list,
        "blocked_posts": blocked_posts_formatted,
        "blocked_comments": blocked_comments_formatted
    }

@router.get("/admin_dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(db: Session = Depends(get_db)):
    # Global counts
    total_users = db.query(User).count()
    total_posts = db.query(Post).count()
    total_comments = db.query(Comment).count()
    blocked_posts = db.query(BlockedPost).count()
    blocked_comments = db.query(BlockedComment).count()
    
    predictions = db.query(Prediction).all()
    total_pred = len(predictions)
    
    agreements = 0
    disagreements = 0
    lr_conf_sum = 0.0
    db_conf_sum = 0.0
    
    for pred in predictions:
        if pred.baseline_pred == pred.distilbert_pred:
            agreements += 1
        else:
            disagreements += 1
            
        lr_conf_sum += calc_confidence(pred.baseline_pred, pred.baseline_prob)
        db_conf_sum += calc_confidence(pred.distilbert_pred, pred.distilbert_prob)
        
    agreement_rate = (agreements / total_pred * 100) if total_pred > 0 else 100.0
    disagreement_rate = (disagreements / total_pred * 100) if total_pred > 0 else 0.0
    lr_avg_conf = (lr_conf_sum / total_pred) if total_pred > 0 else 0.0
    db_avg_conf = (db_conf_sum / total_pred) if total_pred > 0 else 0.0
    
    # Calculate False Positive and False Negative rates
    # FP: distilbert predicted toxic (1), but feedback says is_correct = False and (reason == 'False Positive' or reason == 'Too Strict')
    total_predicted_toxic = db.query(Prediction).filter(Prediction.distilbert_pred == 1).count()
    fps = db.query(Feedback).join(Prediction).filter(
        Prediction.distilbert_pred == 1,
        Feedback.is_correct == False,
        Feedback.reason.in_(["False Positive", "Too Strict"])
    ).count()
    fp_rate = (fps / total_predicted_toxic * 100) if total_predicted_toxic > 0 else 0.0
    
    # FN: distilbert predicted clean (0), but feedback says is_correct = False and (reason == 'False Negative' or reason == 'Too Lenient')
    total_predicted_clean = db.query(Prediction).filter(Prediction.distilbert_pred == 0).count()
    fns = db.query(Feedback).join(Prediction).filter(
        Prediction.distilbert_pred == 0,
        Feedback.is_correct == False,
        Feedback.reason.in_(["False Negative", "Too Lenient"])
    ).count()
    fn_rate = (fns / total_predicted_clean * 100) if total_predicted_clean > 0 else 0.0
    
    # Daily Moderation Statistics (last 7 days)
    daily_stats = []
    today = datetime.date.today()
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_start = datetime.datetime.combine(day, datetime.time.min)
        day_end = datetime.datetime.combine(day, datetime.time.max)
        
        # Count posts/comments, warning and blocked in that date range
        created_p = db.query(Post).filter(Post.created_at >= day_start, Post.created_at <= day_end).count()
        created_c = db.query(Comment).filter(Comment.created_at >= day_start, Comment.created_at <= day_end).count()
        blocked_p = db.query(BlockedPost).filter(BlockedPost.created_at >= day_start, BlockedPost.created_at <= day_end).count()
        blocked_c = db.query(BlockedComment).filter(BlockedComment.created_at >= day_start, BlockedComment.created_at <= day_end).count()
        
        warnings = db.query(Prediction).filter(
            Prediction.timestamp >= day_start,
            Prediction.timestamp <= day_end,
            Prediction.final_decision == "warning"
        ).count()
        
        daily_stats.append({
            "date": day.strftime("%Y-%m-%d"),
            "published_posts": created_p,
            "published_comments": created_c,
            "blocked_posts": blocked_p,
            "blocked_comments": blocked_c,
            "warnings": warnings
        })
        
    # Most Reported Content
    reported_feedbacks = db.query(Feedback).filter(Feedback.is_correct == False).order_by(Feedback.timestamp.desc()).limit(10).all()
    most_reported = []
    for fb in reported_feedbacks:
        pred = fb.prediction
        most_reported.append({
            "feedback_id": fb.id,
            "original_text": pred.original_text,
            "content_type": pred.content_type,
            "distilbert_prob": pred.distilbert_prob,
            "distilbert_pred": pred.distilbert_pred,
            "reason": fb.reason,
            "comment": fb.comment,
            "username": fb.user.username,
            "timestamp": fb.timestamp
        })
        
    # Most Toxic Users
    # Users sorted by ratio of blocked content to total attempted content
    users = db.query(User).all()
    user_toxicity_list = []
    for user in users:
        pub_p = db.query(Post).filter(Post.user_id == user.id).count()
        pub_c = db.query(Comment).filter(Comment.user_id == user.id).count()
        blk_p = db.query(BlockedPost).filter(BlockedPost.user_id == user.id).count()
        blk_c = db.query(BlockedComment).filter(BlockedComment.user_id == user.id).count()
        
        total_attempted = pub_p + pub_c + blk_p + blk_c
        total_blocked = blk_p + blk_c
        
        ratio = (total_blocked / total_attempted) if total_attempted > 0 else 0.0
        
        if total_attempted > 0:
            user_toxicity_list.append({
                "username": user.username,
                "total_attempted": total_attempted,
                "blocked_count": total_blocked,
                "toxicity_ratio": ratio
            })
            
    user_toxicity_list = sorted(user_toxicity_list, key=lambda x: x["toxicity_ratio"], reverse=True)[:5]
    
    # Feedback statistics count
    feedback_reasons = db.query(Feedback.reason, func.count(Feedback.id)).group_by(Feedback.reason).all()
    fb_stats = {r[0]: r[1] for r in feedback_reasons}
    fb_stats["total"] = db.query(Feedback).count()
    fb_stats["correct_count"] = db.query(Feedback).filter(Feedback.is_correct == True).count()
    fb_stats["incorrect_count"] = db.query(Feedback).filter(Feedback.is_correct == False).count()
    
    return {
        "stats": {
            "total_users": total_users,
            "total_posts": total_posts,
            "total_comments": total_comments,
            "blocked_posts": blocked_posts,
            "blocked_comments": blocked_comments,
            "agreement_rate": agreement_rate,
            "disagreement_rate": disagreement_rate,
            "logistic_regression_avg_confidence": lr_avg_conf,
            "distilbert_avg_confidence": db_avg_conf,
            "false_positive_rate": fp_rate,
            "false_negative_rate": fn_rate
        },
        "daily_stats": daily_stats,
        "most_reported": most_reported,
        "most_toxic_users": user_toxicity_list,
        "feedback_stats": fb_stats
    }

@router.get("/model_statistics")
def get_model_statistics(db: Session = Depends(get_db)):
    # Detailed data for plotting histograms of scores
    predictions = db.query(Prediction).all()
    
    # Distribution of scores (bins of 0.1)
    lr_distribution = [0] * 10
    db_distribution = [0] * 10
    
    for pred in predictions:
        lr_bin = min(int(pred.baseline_prob * 10), 9)
        db_bin = min(int(pred.distilbert_prob * 10), 9)
        lr_distribution[lr_bin] += 1
        db_distribution[db_bin] += 1
        
    return {
        "lr_distribution": lr_distribution,
        "db_distribution": db_distribution,
        "total_predictions": len(predictions)
    }

@router.get("/stats")
def get_simple_stats(db: Session = Depends(get_db)):
    # Simple counts for public UI cards
    return {
        "total_posts": db.query(Post).count(),
        "total_comments": db.query(Comment).count(),
        "total_users": db.query(User).count()
    }
