from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Like, Post
from ..schemas import LikeResponse
from ..auth_utils import get_current_user

router = APIRouter(tags=["Likes"])

@router.post("/like", response_model=LikeResponse)
def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing_like = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if existing_like:
        return {"post_id": post_id, "user_id": current_user.id, "liked": True}

    new_like = Like(post_id=post_id, user_id=current_user.id)
    db.add(new_like)
    db.commit()

    return {"post_id": post_id, "user_id": current_user.id, "liked": True}

@router.post("/unlike", response_model=LikeResponse)
def unlike_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing_like = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if not existing_like:
        return {"post_id": post_id, "user_id": current_user.id, "liked": False}

    db.delete(existing_like)
    db.commit()

    return {"post_id": post_id, "user_id": current_user.id, "liked": False}
