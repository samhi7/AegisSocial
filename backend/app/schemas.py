from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserEdit(BaseModel):
    bio: Optional[str] = ""
    profile_pic_url: Optional[str] = ""

class UserResponse(UserBase):
    id: int
    bio: str
    profile_pic_url: str
    join_date: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Post Schemas
class PostCreate(BaseModel):
    content: str = Field(..., min_length=1)
    bypass_warning: Optional[bool] = False

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    bypass_warning: Optional[bool] = False

class LikeResponse(BaseModel):
    post_id: int
    user_id: int
    liked: bool

# Prediction & Feedback Schemas
class FeedbackCreate(BaseModel):
    prediction_id: int
    is_correct: bool
    reason: str
    comment: Optional[str] = ""

class FeedbackResponse(BaseModel):
    id: int
    prediction_id: int
    user_id: int
    is_correct: bool
    reason: str
    comment: str
    timestamp: datetime

    class Config:
        from_attributes = True

class PredictionResponse(BaseModel):
    id: int
    user_id: int
    content_type: str
    content_id: Optional[int]
    original_text: str
    baseline_prob: float
    baseline_pred: int
    distilbert_prob: float
    distilbert_pred: int
    final_decision: str
    timestamp: datetime
    feedback: Optional[FeedbackResponse] = None

    class Config:
        from_attributes = True

class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    content: str
    created_at: datetime
    owner: UserResponse
    prediction: Optional[PredictionResponse] = None

    class Config:
        from_attributes = True

class PostResponse(BaseModel):
    id: int
    user_id: int
    content: str
    created_at: datetime
    owner: UserResponse
    comments: List[CommentResponse] = []
    likes_count: int
    has_liked: bool
    prediction: Optional[PredictionResponse] = None

    class Config:
        from_attributes = True

# Moderation APIs
class PredictRequest(BaseModel):
    text: str

class BatchPredictRequest(BaseModel):
    texts: List[str]

class PredictionResult(BaseModel):
    text: str
    baseline_prob: float
    baseline_pred: int
    distilbert_prob: float
    distilbert_pred: int
    final_decision: str

class BatchPredictResponse(BaseModel):
    predictions: List[PredictionResult]

# Dashboard Schemas
class UserDashboardStats(BaseModel):
    total_posts: int
    total_comments: int
    toxic_posts: int
    toxic_comments: int
    warning_count: int
    blocked_count: int
    clean_percentage: float
    toxic_percentage: float

class AgreementStats(BaseModel):
    agreement_rate: float
    disagreement_count: int
    disagreement_rate: float
    logistic_regression_toxic_count: int
    distilbert_toxic_count: int
    logistic_regression_avg_confidence: float
    distilbert_avg_confidence: float

class ComparisonItem(BaseModel):
    id: int
    content_type: str
    text: str
    baseline_prob: float
    baseline_pred: int
    distilbert_prob: float
    distilbert_pred: int
    final_decision: str
    timestamp: datetime

class UserDashboardResponse(BaseModel):
    stats: UserDashboardStats
    agreement: AgreementStats
    comparison: List[ComparisonItem]
    blocked_posts: List[Dict[str, Any]]
    blocked_comments: List[Dict[str, Any]]

class AdminDashboardStats(BaseModel):
    total_users: int
    total_posts: int
    total_comments: int
    blocked_posts: int
    blocked_comments: int
    agreement_rate: float
    disagreement_rate: float
    logistic_regression_avg_confidence: float
    distilbert_avg_confidence: float
    false_positive_rate: float
    false_negative_rate: float

class AdminDashboardResponse(BaseModel):
    stats: AdminDashboardStats
    daily_stats: List[Dict[str, Any]]
    most_reported: List[Dict[str, Any]]
    most_toxic_users: List[Dict[str, Any]]
    feedback_stats: Dict[str, Any]
