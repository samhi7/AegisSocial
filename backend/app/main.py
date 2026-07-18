from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import auth, posts, comments, likes, moderation, dashboard

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Powered Social Media Platform API",
    description="Backend API with toxic content moderation and models comparison.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(likes.router)
app.include_router(moderation.router)
app.include_router(dashboard.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI-Powered Social Media Moderation API!"}

# Auto-triggered reload by assistant (v2)

