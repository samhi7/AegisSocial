# AegisSocial: AI-Powered Social Media & Moderation Platform

AegisSocial is a modern, full-stack, responsive social media platform (Instagram/X hybrid) featuring real-time AI-powered toxic content moderation, comparative model analytics, and user feedback research pipelines.

The platform automatically routes every post and comment through two machine learning models:
1. **Fine-tuned DistilBERT Transformer** (Primary Model, running on PyTorch + CUDA GPU acceleration)
2. **TF-IDF + Logistic Regression Classifier** (Baseline Model, running in the background for research comparison)

---

## Key Features

- **Professional UI**: Instagram/X-inspired interface with responsive sidebar, glowing buttons, glassmorphic cards, custom SVG analytics charts, and automatic Dark/Light theme switching.
- **JWT Authentication**: Secure user registration, password hashing using `bcrypt`, session state management, and custom avatar generators (DiceBear).
- **Interactive Moderation Engine**:
  - **Toxicity Score < 0.40**: Instantly published to the public feed.
  - **Toxicity Score 0.40 - 0.75**: Prompts the user with an inline warning: *"This content may be offensive. Do you still want to post?"*. The user can choose to **Edit** the text or **Continue Posting** (bypassing the warning).
  - **Toxicity Score > 0.75**: Blocked automatically. Blocked content remains invisible to other users but is accessible to the creator in a private dashboard section.
- **Personal AI Dashboard**: Contains detailed metrics on content performance, a model comparison logs list highlighting disagreements, donut/agreement matrix charts, and a user feedback logging system (e.g. flagging False Positives or False Negatives).
- **Admin Research Portal**: System-wide statistics showing global counts, daily moderation volumes, False Positive/Negative error rates, score density distributions, reported model failures, and users with high toxicity scores.

---

## Directory Structure

```
Mini_project_AI/
├── backend/
│   ├── app/
│   │   ├── models/                 # Serialized TF-IDF and Logistic Regression files
│   │   ├── routes/
│   │   │   ├── auth.py             # User profile, login, and signup routes
│   │   │   ├── posts.py            # Posts CRUD and inline moderation checks
│   │   │   ├── comments.py         # Comments creation with moderation checks
│   │   │   ├── likes.py            # Like/unlike post actions
│   │   │   ├── moderation.py       # Predict, batch predict, and feedback routes
│   │   │   └── dashboard.py        # Stats, user metrics, and research portal routes
│   │   ├── auth_utils.py           # JWT generation/decoding and bcrypt hashing
│   │   ├── database.py             # SQLAlchemy configuration and database sessions
│   │   ├── main.py                 # FastAPI orchestration and CORS setup
│   │   ├── models.py               # SQLAlchemy database mappings
│   │   ├── moderation_utils.py     # AI Moderation logic and calibration wrappers
│   │   ├── schemas.py              # Pydantic schemas for REST validation
│   │   ├── test_moderation.py      # Automated moderation test suites
│   │   └── train_baseline.py       # Programmatic baseline training script
│   ├── requirements.txt            # Python dependencies
│   └── run.py                      # Starts the Uvicorn web server
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CustomChart.jsx     # SVG-based interactive donut, line, and matrix charts
│   │   │   └── Navbar.jsx          # Sticky sidebar navigation with responsive modes
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # API auth state provider
│   │   │   └── ThemeContext.jsx    # Dark/Light mode provider
│   │   ├── pages/
│   │   │   ├── Auth.jsx            # Sign up and login page
│   │   │   ├── Feed.jsx            # Central feed and post creator with warning modal
│   │   │   ├── Profile.jsx         # Edit bio, edit profile pic, and user timelines
│   │   │   ├── UserDashboard.jsx   # Individual metrics, feedback form, and blocked drawer
│   │   │   └── AdminDashboard.jsx  # Global statistics, reported errors, and score density
│   │   ├── App.jsx                 # Routing and layout structure
│   │   ├── index.css               # Global stylesheets, scrollbars, and theme variables
│   │   └── main.jsx                # DOM mounter
│   ├── package.json                # Frontend dependencies (react-router-dom, lucide-react)
│   └── vite.config.js              # Vite bundler options
├── run_all.py                      # Roots runner to run backend & frontend together
└── README.md                       # Documentation
```

---

## Database Schema (SQLite)

- **`users`**: Stored credentials, bio details, dynamic avatars, and join dates.
- **`posts`**: Approved public posts.
- **`comments`**: Approved public comments.
- **`likes`**: Post likes referencing post and user tables.
- **`blocked_posts`**: Private posts violating guidelines (>0.75 score).
- **`blocked_comments`**: Private comments violating guidelines (>0.75 score).
- **`predictions`**: Toxicity log of every published or blocked post/comment (storing TF-IDF & DistilBERT scores).
- **`feedback`**: Error reports submitted by users (False Positive, False Negative, etc.).
- **`statistics`**: Cached system metrics.

---

## Setup & Running Instructions

### Prerequisites
Make sure you have **Node.js** (v18+) and **Python** (3.10+) installed.

### Automatic Startup (Recommended)
You can start both the backend and frontend development servers concurrently using the root runner script.

1. Open PowerShell/Terminal at the project root directory (`Mini_project_AI`).
2. Start the orchestrator:
   ```bash
   python run_all.py
   ```
   This script will:
   - Automatically compile the baseline model if it is not already trained.
   - Boot the FastAPI backend server on `http://127.0.0.1:8000`.
   - Boot the Vite React server on `http://localhost:5173`.
   - Forward both process logs directly to your terminal.

---

### Manual Setup (Step-by-Step)

If you prefer starting the backend and frontend separately:

#### 1. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Train the baseline TF-IDF + Logistic Regression model:
   ```bash
   python app/train_baseline.py
   ```
4. Launch the FastAPI server:
   ```bash
   python run.py
   ```
   The backend API will run on `http://127.0.0.1:8000`. You can inspect the interactive OpenAPI docs at `http://127.0.0.1:8000/docs`.

#### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Start the React app:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## Running Verification Tests

To verify that the AI moderation engine is functioning correctly (validating threshold rules, calibrations, and model exports), run:
```bash
python backend/app/test_moderation.py
```
Expected output:
```text
Device set to use cuda:0
....
----------------------------------------------------------------------
Ran 4 tests in 0.425s

OK
```
