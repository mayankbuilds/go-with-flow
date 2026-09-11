import httpx
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from app.database import SessionDep
from app.models.coding import CodingLog
from app.models.stats import UserStats
from app.schemas.coding import (
    CodingAnalyticsResponse,
    CodingLogCreate,
    CodingLogResponse,
    CodingLogUpdate,
    CodingSyncResult,
    CodeforcesSyncRequest,
    DifficultyStat,
    HeatmapDay,
    LeetCodeSyncRequest,
    PlatformStat,
)

router = APIRouter(prefix="/coding", tags=["Coding"])


@router.post(
    "/logs", response_model=CodingLogResponse, status_code=status.HTTP_201_CREATED
)
def log_problem(log_data: CodingLogCreate, db: SessionDep):
    data = log_data.model_dump()
    today = date.today()
    if not data.get("solved_at"):
        data["solved_at"] = today

    log = CodingLog(**data)
    db.add(log)

    # Award 30 XP on coding submission
    stats = db.scalars(select(UserStats)).first()
    if stats:
        stats.xp += 30
        stats.level = (stats.xp // 300) + 1
        if stats.last_active_date != today:
            stats.current_streak_days += 1
            stats.last_active_date = today
            if stats.current_streak_days > stats.longest_streak_days:
                stats.longest_streak_days = stats.current_streak_days

    db.commit()
    db.refresh(log)
    return log


@router.get("/logs", response_model=list[CodingLogResponse])
def get_recent_logs(db: SessionDep, limit: int = 10, offset: int = 0):
    stmt = (
        select(CodingLog)
        .order_by(CodingLog.solved_at.desc(), CodingLog.id.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


@router.put("/logs/{log_id}", response_model=CodingLogResponse)
def update_coding_log(log_id: int, payload: CodingLogUpdate, db: SessionDep):
    stmt = select(CodingLog).where(CodingLog.id == log_id)
    log = db.scalars(stmt).first()
    if not log:
        raise HTTPException(status_code=404, detail="Submission log not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(log, field, value)

    db.commit()
    db.refresh(log)
    return log


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coding_log(log_id: int, db: SessionDep):
    stmt = select(CodingLog).where(CodingLog.id == log_id)
    log = db.scalars(stmt).first()
    if not log:
        raise HTTPException(status_code=404, detail="Submission log not found")

    db.delete(log)
    db.commit()
    return None


@router.get("/heatmap", response_model=list[HeatmapDay])
def get_heatmap_data(db: SessionDep, days: int = 112):
    start_date = date.today() - timedelta(days=days)
    stmt = (
        select(CodingLog.solved_at, func.count(CodingLog.id))
        .where(CodingLog.solved_at >= start_date)
        .group_by(CodingLog.solved_at)
        .order_by(CodingLog.solved_at.asc())
    )
    results = db.execute(stmt).all()
    return [{"date": str(row[0]), "count": row[1]} for row in results]


@router.post("/sync/leetcode", response_model=CodingSyncResult)
def sync_leetcode(payload: LeetCodeSyncRequest, db: SessionDep):
    username = payload.username.strip()
    query = """
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
        profile {
          ranking
        }
      }
      recentAcSubmissionList(username: $username, limit: 15) {
        id
        title
        titleSlug
        timestamp
      }
    }
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://leetcode.com",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://leetcode.com/graphql",
                json={"query": query, "variables": {"username": username}},
                headers=headers,
            )
            data = resp.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach LeetCode API: {str(e)}",
        )

    matched_user = data.get("data", {}).get("matchedUser")
    if not matched_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LeetCode user '{username}' not found",
        )

    ac_counts = {
        item["difficulty"]: item["count"]
        for item in matched_user.get("submitStats", {}).get("acSubmissionNum", [])
    }
    total_solved = ac_counts.get("All", 0)
    easy_solved = ac_counts.get("Easy", 0)
    medium_solved = ac_counts.get("Medium", 0)
    hard_solved = ac_counts.get("Hard", 0)
    ranking = matched_user.get("profile", {}).get("ranking")
    rank_str = f"Rank #{ranking:,}" if ranking else None

    # Sync recent accepted submissions into database
    recent_subs = data.get("data", {}).get("recentAcSubmissionList", []) or []
    synced_count = 0
    today = date.today()

    for sub in recent_subs:
        title = sub.get("title")
        if not title:
            continue
        # Check if already in DB
        exists = db.scalars(
            select(CodingLog).where(
                CodingLog.platform == "LeetCode",
                CodingLog.problem_title == title,
            )
        ).first()

        if not exists:
            ts = int(sub.get("timestamp", 0))
            solved_date = date.fromtimestamp(ts) if ts > 0 else today
            slug = sub.get("titleSlug", "")
            new_log = CodingLog(
                problem_title=title,
                platform="LeetCode",
                difficulty="Medium",
                topic_tag="LeetCode Sync",
                problem_url=f"https://leetcode.com/problems/{slug}" if slug else None,
                solved_at=solved_date,
            )
            db.add(new_log)
            synced_count += 1

    if synced_count > 0:
        stats = db.scalars(select(UserStats)).first()
        if stats:
            stats.xp += synced_count * 30
            stats.level = (stats.xp // 300) + 1
            if stats.last_active_date != today:
                stats.current_streak_days += 1
                stats.last_active_date = today
                if stats.current_streak_days > stats.longest_streak_days:
                    stats.longest_streak_days = stats.current_streak_days

    db.commit()

    return CodingSyncResult(
        platform="LeetCode",
        handle=username,
        total_solved=total_solved,
        easy_solved=easy_solved,
        medium_solved=medium_solved,
        hard_solved=hard_solved,
        rank=rank_str,
        synced_problems_count=synced_count,
        message=f"Synced {synced_count} new problem(s) from LeetCode! Total solved: {total_solved}",
    )


@router.post("/sync/codeforces", response_model=CodingSyncResult)
def sync_codeforces(payload: CodeforcesSyncRequest, db: SessionDep):
    handle = payload.handle.strip()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        with httpx.Client(timeout=12.0, headers=headers) as client:
            user_info_resp = client.get(
                f"https://codeforces.com/api/user.info?handles={handle}"
            )
            subs_resp = client.get(
                f"https://codeforces.com/api/user.status?handle={handle}&from=1&count=100"
            )

            user_data = user_info_resp.json()
            subs_data = subs_resp.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach Codeforces API: {str(e)}",
        )

    if user_data.get("status") != "OK" or not user_data.get("result"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Codeforces user '{handle}' not found",
        )

    cf_user = user_data["result"][0]
    rating = cf_user.get("rating")
    rank_title = cf_user.get("rank")

    # Extract accepted submissions
    synced_count = 0
    today = date.today()
    unique_solved_titles = set()

    for sub in subs_data.get("result", []):
        if sub.get("verdict") == "OK":
            prob = sub.get("problem", {})
            p_name = prob.get("name")
            p_index = prob.get("index", "")
            contest_id = prob.get("contestId", "")
            if p_name:
                full_title = f"{contest_id}{p_index} - {p_name}"
                unique_solved_titles.add(full_title)

                exists = db.scalars(
                    select(CodingLog).where(
                        CodingLog.platform == "Codeforces",
                        CodingLog.problem_title == full_title,
                    )
                ).first()

                if not exists:
                    ts = sub.get("creationTimeSeconds", 0)
                    solved_date = date.fromtimestamp(ts) if ts > 0 else today
                    prob_url = (
                        f"https://codeforces.com/contest/{contest_id}/problem/{p_index}"
                        if contest_id
                        else None
                    )
                    tags = prob.get("tags", [])
                    tag = tags[0] if tags else "Competitive Programming"

                    # Map Codeforces rating to difficulty
                    p_rating = prob.get("rating", 1200)
                    if p_rating < 1200:
                        diff = "Easy"
                    elif p_rating < 1700:
                        diff = "Medium"
                    else:
                        diff = "Hard"

                    new_log = CodingLog(
                        problem_title=full_title,
                        platform="Codeforces",
                        difficulty=diff,
                        topic_tag=tag,
                        problem_url=prob_url,
                        solved_at=solved_date,
                    )
                    db.add(new_log)
                    synced_count += 1

    if synced_count > 0:
        stats = db.scalars(select(UserStats)).first()
        if stats:
            stats.xp += synced_count * 30
            stats.level = (stats.xp // 300) + 1
            if stats.last_active_date != today:
                stats.current_streak_days += 1
                stats.last_active_date = today
                if stats.current_streak_days > stats.longest_streak_days:
                    stats.longest_streak_days = stats.current_streak_days

    db.commit()

    total_cf_in_db = db.scalar(
        select(func.count(CodingLog.id)).where(CodingLog.platform == "Codeforces")
    ) or len(unique_solved_titles)

    return CodingSyncResult(
        platform="Codeforces",
        handle=handle,
        total_solved=total_cf_in_db,
        rating=rating,
        rank=rank_title.title() if rank_title else None,
        synced_problems_count=synced_count,
        message=f"Synced {synced_count} new problem(s) from Codeforces! Rating: {rating or 'Unrated'}",
    )


@router.get("/analytics", response_model=CodingAnalyticsResponse)
def get_coding_analytics(db: SessionDep):
    # Total solved
    total_solved = db.scalar(select(func.count(CodingLog.id))) or 0

    # Platform counts
    platform_stmt = select(CodingLog.platform, func.count(CodingLog.id)).group_by(
        CodingLog.platform
    )
    platform_rows = db.execute(platform_stmt).all()
    color_map = {
        "LeetCode": "#f59e0b",
        "Codeforces": "#3b82f6",
        "CodeChef": "#8b5cf6",
        "HackerRank": "#10b981",
        "AtCoder": "#ec4899",
    }
    platforms = [
        PlatformStat(
            platform=row[0],
            count=row[1],
            color=color_map.get(row[0], "#64748b"),
        )
        for row in platform_rows
    ]

    # Difficulty counts - Always include Easy, Medium, Hard
    diff_stmt = select(CodingLog.difficulty, func.count(CodingLog.id)).group_by(
        CodingLog.difficulty
    )
    diff_rows = db.execute(diff_stmt).all()
    diff_dict = {row[0]: row[1] for row in diff_rows}
    diff_color_map = {
        "Easy": "#10b981",
        "Medium": "#f59e0b",
        "Hard": "#ef4444",
    }
    difficulties = [
        DifficultyStat(
            difficulty=d,
            count=diff_dict.get(d, 0),
            color=diff_color_map[d],
        )
        for d in ["Easy", "Medium", "Hard"]
    ]

    return CodingAnalyticsResponse(
        total_solved=total_solved,
        platform_breakdown=platforms,
        difficulty_breakdown=difficulties,
    )
