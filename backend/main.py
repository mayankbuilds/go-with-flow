from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import coding, focus, routine, stats

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StreakFlow Command Center API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers
app.include_router(coding.router)
app.include_router(focus.router)
app.include_router(routine.router)
app.include_router(stats.router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "2.0.0"}