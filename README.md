# GowithFlow

> A local-first, privacy-focused developer command center and student routine architect built with modern FastAPI, Next.js (App Router), and Google Drive synchronization.

---

## Overview

**GowithFlow** is designed for student developers and engineers who prioritize high-tempo daily execution without data compromises. Unlike typical task apps that store personal habits on third-party servers, GowithFlow utilizes a **Local-First, Zero-Knowledge Storage Architecture** inspired by Cashew. Your operational routines, Rule-of-3 non-negotiables, and coding submissions reside entirely on your device with optional encrypted synchronization directly into your personal Google Drive (`appDataFolder`).

---

## Core Features

### 1. The Execution Arena
* **Activity Matrix:** Interactive 16-week contribution heatmap tracking coding submissions across platforms (LeetCode, Codeforces, GeeksforGeeks, Custom).
* **Submission Ledger:** Rapid logging with difficulty tagging (`Easy`, `Medium`, `Hard`) and automatic date indexing.
* **Auto-Recalculating Streaks:** Live tracker logging active streak days and longest consistency runs.

### 2. Focus & Routine Architect
* **Rule of 3 Engine:** Prioritize exactly three non-negotiables each day to eliminate analysis paralysis.
* **Student Routine Timetable:** Time-bound habit blocks with dynamic reminder alerts (`Active Now`, `Starts in X mins`, `Late / Pending`).
* **Auto-Reset Lifecycle:** Daily blocks reset state dynamically at midnight while preserving historical logs.

### 3. Gamification & RPG Hierarchy
* **Tier Progression:** Earn Experience Points (`+30 XP` per problem, `+20 XP` per focus goal, `+40 XP` per routine block).
* **Dynamic Leveling:** Level scales every 300 XP with visual progression bars.
* **Milestones & Badges:** Unlockable achievement tiers (`First Blood`, `Week Warrior`, `Centurion`, `Shield Bearer`).

### 4. Privacy-First Cloud Vault
* **Google Drive `appDataFolder` Sync:** One-click OAuth 2.0 backup and restore. Data is stored strictly inside your private hidden application sandbox on Google Drive.
* **Zero Third-Party Databases:** No external accounts, no telemetry, and zero subscription costs.

### 5. Cross-Platform Responsive Shell
* **Desktop Console:** Wide dual-pane layout optimized for wide screens and multi-tasking.
* **Mobile PWA:** Installable Progressive Web App with dedicated bottom navigation bar, touch optimizations, and offline readiness.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide React, Canvas Confetti |
| **Backend** | Python 3.10+, FastAPI (Modern `Annotated` Dependencies), SQLAlchemy 2.0, Pydantic V2 |
| **Storage** | SQLite (Local Device), Google Drive API v3 (`appDataFolder`) |
| **Auth** | Google Identity Services (GIS) OAuth 2.0 (Client-side token exchange) |

---

## Architecture & Directory Layout

```text
gowithflow/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy ORM models (coding, focus, routine, stats)
│   │   ├── routers/       # Modular FastAPI routers with Annotated session injection
│   │   ├── schemas/       # Strict Pydantic V2 validation models
│   │   └── database.py    # Database engine and yield-based session dependencies
│   ├── main.py            # Application entrypoint & CORS middleware
│   └── requirements.txt   # Backend dependencies
├── frontend/
│   ├── public/            # PWA manifest, service workers, and icons
│   ├── src/
│   │   ├── app/           # App Router layout, root orchestrator, and metadata
│   │   ├── components/
│   │   │   ├── arena/     # Heatmap, ProblemLogger, and RecentLogs
│   │   │   ├── focus/     # DailyFocusCard and FocusSection
│   │   │   ├── navigation/# Header and MobileBottomNav
│   │   │   ├── routine/   # RoutineSection and time-bound triggers
│   │   │   ├── settings/  # Drive backup and local snapshot engines
│   │   │   └── stats/     # AchievementsView and milestone cards
│   │   ├── lib/           # Centralized API layer (api.ts) & Drive client (driveSync.ts)
│   │   └── types/         # Common TypeScript interfaces
│   └── .env.local         # Client credentials (Google OAuth ID)
└── README.md

Getting Started
Prerequisites
Python 3.10+

Node.js 18+ & npm

A Google Cloud Project with the Google Drive API enabled

Backend Setup
Navigate to the backend folder:

Bash
cd backend
Create and activate a Python virtual environment:

Bash
python -m venv venv
source venv/bin/activate   # On Windows use: venv\Scripts\activate
Install requirements:

Bash
pip install -r requirements.txt
Launch the development server:

Bash
uvicorn main:app --reload --port 8000
The backend API will run at http://localhost:8000. Interactive documentation is available at http://localhost:8000/docs.

Frontend Setup
Navigate to the frontend directory:

Bash
cd frontend
Install dependencies:

Bash
npm install
Configure environment variables:
Create a .env.local file in frontend/:

Code snippet
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
Run the development server:

Bash
npm run dev
Open http://localhost:3000 in your browser.

Google Drive Sync Configuration
Visit the Google Cloud Console.

Enable the Google Drive API.

Under OAuth consent screen, set the scope:

Plaintext
[https://www.googleapis.com/auth/drive.appdata](https://www.googleapis.com/auth/drive.appdata)
Add your email address to the Test Users list.

Create an OAuth 2.0 Web Client ID:

Add http://localhost:3000 to Authorized JavaScript origins.

Leave Authorized Redirect URIs blank.

Copy your Client ID into frontend/.env.local.

License
Distributed under the MIT License. See LICENSE for more information.