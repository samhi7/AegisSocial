import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    bio = Column(Text, default="")
    profile_pic_url = Column(String, default="")
    join_date = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    posts = relationship("Post", back_populates="owner", cascade="all, delete-orphan")
    blocked_posts = relationship("BlockedPost", back_populates="owner", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="owner", cascade="all, delete-orphan")
    blocked_comments = relationship("BlockedComment", back_populates="owner", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")

class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="likes")
    user = relationship("User", back_populates="likes")

class BlockedPost(Base):
    __tablename__ = "blocked_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="blocked_posts")
    comments = relationship(
        "BlockedComment",
        back_populates="post",
        primaryjoin="BlockedPost.id==BlockedComment.post_id",
        foreign_keys="[BlockedComment.post_id]",
        cascade="all, delete-orphan"
    )

class BlockedComment(Base):
    __tablename__ = "blocked_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False) # References the target public post
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="blocked_comments")
    post = relationship("BlockedPost", back_populates="comments", foreign_keys=[post_id], primaryjoin="BlockedComment.post_id==BlockedPost.id", overlaps="post", post_update=True)
    public_post = relationship("Post", foreign_keys=[post_id], primaryjoin="BlockedComment.post_id==Post.id", overlaps="comments,post")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content_type = Column(String, nullable=False)  # 'post' or 'comment'
    content_id = Column(Integer, nullable=True)     # ID of the Post/Comment/BlockedPost/BlockedComment
    original_text = Column(Text, nullable=False)
    baseline_prob = Column(Float, nullable=False)
    baseline_pred = Column(Integer, nullable=False)
    distilbert_prob = Column(Float, nullable=False)
    distilbert_pred = Column(Integer, nullable=False)
    final_decision = Column(String, nullable=False)  # 'publish', 'warning', 'block'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    feedback = relationship("Feedback", back_populates="prediction", uselist=False, cascade="all, delete-orphan")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    reason = Column(String, nullable=False)  # 'False Positive', 'False Negative', 'Too Strict', 'Too Lenient', 'Unsure'
    comment = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    prediction = relationship("Prediction", back_populates="feedback")
    user = relationship("User", back_populates="feedbacks")

class Statistic(Base):
    __tablename__ = "statistics"

    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String, unique=True, index=True, nullable=False)
    metric_value = Column(Float, nullable=False)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
