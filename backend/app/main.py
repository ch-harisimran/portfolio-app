from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from .core.config import settings
from .core.database import Base, engine
from . import models  # noqa: F401 - ensure SQLAlchemy models are registered
from .api.v1.api import api_router
from .scheduler import start_scheduler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def initialize_app() -> None:
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
    except Exception:
        logger.exception("Failed to initialize database tables")
        raise

    if not os.getenv("VERCEL"):
        start_scheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="PakFinance API",
    description="Private finance management for Pakistani investors",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

initialize_app()


@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/api/health")
def api_health():
    return {"status": "healthy", "version": "1.0.0"}
