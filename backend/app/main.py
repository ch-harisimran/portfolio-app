from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .core.config import settings
from .core.database import Base, engine
from .api.v1.api import api_router
from .scheduler import start_scheduler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    # Start background scheduler
    start_scheduler()
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}
