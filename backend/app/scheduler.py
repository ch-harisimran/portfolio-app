"""Background scheduler for periodic market data updates."""
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .core.database import SessionLocal
from .services.psx_scraper import fetch_psx_data
from .services.mufap_scraper import fetch_mufap_data

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _run_psx():
    db = SessionLocal()
    try:
        await fetch_psx_data(db)
    except Exception as e:
        logger.error(f"Scheduled PSX fetch error: {e}")
    finally:
        db.close()


async def _run_mufap():
    db = SessionLocal()
    try:
        await fetch_mufap_data(db)
    except Exception as e:
        logger.error(f"Scheduled MUFAP fetch error: {e}")
    finally:
        db.close()


def start_scheduler():
    # PSX: every 15 minutes on weekdays 9:30 - 15:30 PKT
    scheduler.add_job(_run_psx, "cron", minute="*/15", hour="4-10", day_of_week="mon-fri", id="psx_data")
    # MUFAP: once daily at 18:00 PKT (13:00 UTC)
    scheduler.add_job(_run_mufap, "cron", hour=13, minute=0, id="mufap_data")
    # Initial seed on startup
    scheduler.add_job(_run_psx, "date", id="psx_seed")
    scheduler.add_job(_run_mufap, "date", id="mufap_seed")
    scheduler.start()
    logger.info("Market data scheduler started")
