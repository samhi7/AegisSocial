from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserLogin, UserEdit, UserResponse, Token
from ..auth_utils import get_password_hash, verify_password, create_access_token, get_current_user
import datetime

router = APIRouter(tags=["Authentication"])

@router.post("/signup", response_model=Token)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if username or email exists
    db_user_username = db.query(User).filter(User.username == user_in.username).first()
    if db_user_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    db_user_email = db.query(User).filter(User.email == user_in.email).first()
    if db_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password and create user
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hashed_pwd,
        profile_pic_url=f"https://api.dicebear.com/7.x/adventurer/svg?seed={user_in.username}", # Premium-looking dynamic avatar
        bio="Hello! I just joined the platform."
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue token
    access_token = create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == credentials.username).first()
    if not db_user or not verify_password(credentials.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    access_token = create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer", "user": db_user}

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(profile_in: UserEdit, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if profile_in.bio is not None:
        current_user.bio = profile_in.bio
    if profile_in.profile_pic_url:
        current_user.profile_pic_url = profile_in.profile_pic_url
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/profile/{username}", response_model=UserResponse)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == username).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return db_user
