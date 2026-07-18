from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, Post, BlockedPost, Prediction, Like, Comment
from ..schemas import PostCreate, PostResponse, PredictionResponse
from ..auth_utils import get_current_user
from ..moderation_utils import moderator
import datetime

router = APIRouter(tags=["Posts"])

@router.post("/create_post")
def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    text = post_in.content.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    # Run AI Moderation
    mod_results = moderator.moderate_text(text)
    decision = mod_results["final_decision"]

    # 1. Blocked flow (> 0.75)
    if decision == "block":
        # Save to BlockedPosts table
        blocked_post = BlockedPost(user_id=current_user.id, content=text)
        db.add(blocked_post)
        db.commit()
        db.refresh(blocked_post)

        # Save prediction
        prediction = Prediction(
            user_id=current_user.id,
            content_type="post",
            content_id=blocked_post.id,
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
            "message": "This content violates community guidelines.",
            "prediction": {
                "baseline_prob": mod_results["baseline_prob"],
                "distilbert_prob": mod_results["distilbert_prob"],
                "final_decision": "block"
            }
        }

    # 2. Warning flow (0.40 - 0.75)
    elif decision == "warning" and not post_in.bypass_warning:
        # We do not save the post or prediction in the permanent DB yet.
        # We return a warning status to let the frontend present the dialog.
        return {
            "status": "warning",
            "message": "This content may be offensive. Do you still want to post?",
            "prediction": {
                "baseline_prob": mod_results["baseline_prob"],
                "distilbert_prob": mod_results["distilbert_prob"],
                "final_decision": "warning"
            }
        }

    # 3. Publish flow (either clean (<0.40) or bypassed warning)
    # Create public post
    new_post = Post(user_id=current_user.id, content=text)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    # Save prediction
    prediction = Prediction(
        user_id=current_user.id,
        content_type="post",
        content_id=new_post.id,
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
        "post_id": new_post.id,
        "message": "Post published successfully."
    }

@router.get("/get_posts", response_model=List[PostResponse])
def get_posts(
    username: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve all approved (unblocked) posts.
    query = db.query(Post)
    
    if username:
        user = db.query(User).filter(User.username == username).first()
        if user:
            query = query.filter(Post.user_id == user.id)
        else:
            return []

    posts = query.order_by(Post.created_at.desc()).all()
    
    response_posts = []
    for post in posts:
        # Get likes count
        likes_count = db.query(Like).filter(Like.post_id == post.id).count()
        # Has current user liked this post?
        has_liked = False
        if current_user:
            has_liked = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user.id).first() is not None
        
        # Get moderation prediction
        pred = db.query(Prediction).filter(
            Prediction.content_type == "post",
            Prediction.content_id == post.id
        ).first()

        # Format comments
        comments_list = []
        for comment in post.comments:
            comment_pred = db.query(Prediction).filter(
                Prediction.content_type == "comment",
                Prediction.content_id == comment.id
            ).first()
            
            comments_list.append({
                "id": comment.id,
                "post_id": comment.post_id,
                "user_id": comment.user_id,
                "content": comment.content,
                "created_at": comment.created_at,
                "owner": comment.owner,
                "prediction": comment_pred
            })

        response_posts.append({
            "id": post.id,
            "user_id": post.user_id,
            "content": post.content,
            "created_at": post.created_at,
            "owner": post.owner,
            "comments": comments_list,
            "likes_count": likes_count,
            "has_liked": has_liked,
            "prediction": pred
        })

    return response_posts

@router.delete("/delete_post/{post_id}")
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Try public posts first
    post = db.query(Post).filter(Post.id == post_id).first()
    is_blocked_table = False
    
    if not post:
        # Check BlockedPosts table
        post = db.query(BlockedPost).filter(BlockedPost.id == post_id).first()
        is_blocked_table = True

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    # Delete prediction first
    db.query(Prediction).filter(
        Prediction.content_type == "post",
        Prediction.content_id == post_id
    ).delete()

    # Delete main post/blocked post
    db.delete(post)
    db.commit()

    return {"message": "Post deleted successfully"}

@router.put("/update_post/{post_id}")
def update_post(
    post_id: int,
    post_in: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Can only update public posts (blocked posts cannot be edited directly, they must be recreated)
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")

    text = post_in.content.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    # Re-run AI moderation
    mod_results = moderator.moderate_text(text)
    decision = mod_results["final_decision"]

    if decision == "block":
        # Delete original post from public feed
        db.delete(post)
        db.commit()

        # Add to BlockedPosts table
        blocked_post = BlockedPost(user_id=current_user.id, content=text)
        db.add(blocked_post)
        db.commit()
        db.refresh(blocked_post)

        # Update prediction
        pred = db.query(Prediction).filter(
            Prediction.content_type == "post",
            Prediction.content_id == post_id
        ).first()
        
        if pred:
            pred.content_id = blocked_post.id
            pred.original_text = text
            pred.baseline_prob = mod_results["baseline_prob"]
            pred.baseline_pred = mod_results["baseline_pred"]
            pred.distilbert_prob = mod_results["distilbert_prob"]
            pred.distilbert_pred = mod_results["distilbert_pred"]
            pred.final_decision = "block"
        else:
            pred = Prediction(
                user_id=current_user.id,
                content_type="post",
                content_id=blocked_post.id,
                original_text=text,
                baseline_prob=mod_results["baseline_prob"],
                baseline_pred=mod_results["baseline_pred"],
                distilbert_prob=mod_results["distilbert_prob"],
                distilbert_pred=mod_results["distilbert_pred"],
                final_decision="block"
            )
            db.add(pred)
        db.commit()

        return {
            "status": "blocked",
            "message": "Your edited content violates community guidelines and has been blocked.",
            "prediction": {
                "baseline_prob": mod_results["baseline_prob"],
                "distilbert_prob": mod_results["distilbert_prob"],
                "final_decision": "block"
            }
        }

    elif decision == "warning" and not post_in.bypass_warning:
        return {
            "status": "warning",
            "message": "Your updated content may be offensive. Do you still want to post?",
            "prediction": {
                "baseline_prob": mod_results["baseline_prob"],
                "distilbert_prob": mod_results["distilbert_prob"],
                "final_decision": "warning"
            }
        }

    # Publish/Save the edited text
    post.content = text
    db.commit()

    # Update prediction
    pred = db.query(Prediction).filter(
        Prediction.content_type == "post",
        Prediction.content_id == post_id
    ).first()
    
    if pred:
        pred.original_text = text
        pred.baseline_prob = mod_results["baseline_prob"]
        pred.baseline_pred = mod_results["baseline_pred"]
        pred.distilbert_prob = mod_results["distilbert_prob"]
        pred.distilbert_pred = mod_results["distilbert_pred"]
        pred.final_decision = decision
    else:
        pred = Prediction(
            user_id=current_user.id,
            content_type="post",
            content_id=post_id,
            original_text=text,
            baseline_prob=mod_results["baseline_prob"],
            baseline_pred=mod_results["baseline_pred"],
            distilbert_prob=mod_results["distilbert_prob"],
            distilbert_pred=mod_results["distilbert_pred"],
            final_decision=decision
        )
        db.add(pred)
    db.commit()

    return {
        "status": "published",
        "post_id": post.id,
        "message": "Post updated successfully."
    }
