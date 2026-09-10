# GowithFlow 🌊

A local-first, privacy-focused developer command center and student routine architect built with FastAPI, Next.js, and Google Drive sync.

---

## Overview

**GowithFlow** is designed for student developers and engineers who prioritize high-tempo daily execution without centralized data tracking. Your operational routines, Rule-of-3 non-negotiables, and coding submissions reside entirely on your local device, with optional encrypted snapshot backups synced directly to your personal Google Drive (`appDataFolder`).

---

## Core Features

* **Activity Matrix:** Interactive 16-week contribution heatmap tracking coding submissions across platforms (LeetCode, Codeforces, GeeksforGeeks, Custom).
* **Submission Ledger:** Rapid problem logging with difficulty categorization (`Easy`, `Medium`, `Hard`) and automatic date indexing.
* **Auto-Recalculating Streaks:** Live tracker recording active streak days and longest consistency runs.
* **Rule of 3 Engine:** Prioritize exactly three non-negotiables each day to eliminate task paralysis.
* **Student Routine Timetable:** Time-bound habit blocks with dynamic reminder alerts (`Active Now`, `Starts at X`, `Late / Pending`).
* **Gamification & RPG Hierarchy:** Earn XP (`+30 XP` per problem, `+20 XP` per focus goal, `+40 XP` per routine block) to advance tiers and unlock milestone achievements.
* **Privacy-First Cloud Vault:** One-click OAuth 2.0 backup and restore directly into your private hidden application sandbox on Google Drive. Zero third-party databases.
* **Dual Responsive Shell:** Full dual-column control deck for desktop screens and an installable PWA with bottom navigation for mobile devices.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide React, Canvas Confetti |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy 2.0, Pydantic V2 |
| **Storage** | SQLite (Local Device), Google Drive API v3 (`appDataFolder`) |
| **Auth** | Google Identity Services (GIS) OAuth 2.0 |

---

## Project Structure

```text
go-with-flow/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── routers/       # Modular FastAPI routers
│   │   ├── schemas/       # Pydantic V2 schemas
│   │   └── database.py    # Database connection & session dependencies
│   ├── main.py            # Application entrypoint & CORS setup
│   └── requirements.txt   # Backend dependencies
├── frontend/
│   ├── public/            # PWA manifest, service workers, and icons
│   ├── src/
│   │   ├── app/           # App Router layout, root orchestrator, and metadata
│   │   ├── components/
│   │   │   ├── arena/     # Heatmap, ProblemLogger, and RecentLogs
│   │   │   ├── focus/     # DailyFocusCard and FocusSection
│   │   │   ├── navigation/# Header and MobileNav
│   │   │   ├── routine/   # RoutineSection
│   │   │   ├── settings/  # Drive backup and storage controls
│   │   │   └── stats/     # AchievementsView
│   │   ├── lib/           # Centralized API client & Drive sync engine
│   │   └── types/         # TypeScript interfaces
│   └── .env.local         # Client credentials
└── README.md
```

---

## Getting Started

### Prerequisites

* Python 3.10+
* Node.js 18+ & npm
* Google Cloud Project with the Google Drive API enabled

---

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the API server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. OpenAPI documentation is accessible at `http://localhost:8000/docs`.

---

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file inside `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

4. Run the frontend application:
```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Google Drive Cloud Vault Setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API**.
3. Under **OAuth consent screen**, add the scope:
```text
https://www.googleapis.com/auth/drive.appdata
```
4. Add your personal Google account to **Test Users**.
5. Under **Credentials**, create an **OAuth 2.0 Web Client ID**:
   * Add `http://localhost:3000` to **Authorized JavaScript origins**.
   * Leave Authorized redirect URIs empty.
6. Copy the Client ID into `frontend/.env.local`.

---

## License

Distributed under the MIT License.