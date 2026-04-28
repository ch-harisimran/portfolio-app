"""
MUFAP mutual fund NAV fetcher.
Primary: MUFAP website (https://www.mufap.com.pk)
Fallback: seed data with major Pakistani AMCs and funds.
"""
import httpx
import logging
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from ..models.market_data import MutualFundNAVCache

logger = logging.getLogger(__name__)

MUFAP_URL = "https://beta.mufap.com.pk/Industry/IndustryStatDaily?tab=3"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
}

SEED_FUNDS = [
    # Meezan Bank / Al Meezan
    {"fund_name": "Meezan Cash Fund", "amc_name": "Al Meezan Investments", "fund_type": "Money Market", "nav": 103.50},
    {"fund_name": "Meezan Islamic Fund", "amc_name": "Al Meezan Investments", "fund_type": "Equity", "nav": 85.20},
    {"fund_name": "Meezan Balanced Fund", "amc_name": "Al Meezan Investments", "fund_type": "Balanced", "nav": 72.40},
    {"fund_name": "Meezan Government Securities Fund", "amc_name": "Al Meezan Investments", "fund_type": "Debt", "nav": 115.80},
    # MCB Arif Habib
    {"fund_name": "MCB Cash Management Optimizer", "amc_name": "MCB-Arif Habib Savings & Investments", "fund_type": "Money Market", "nav": 100.20},
    {"fund_name": "MCB Pakistan Stock Market Fund", "amc_name": "MCB-Arif Habib Savings & Investments", "fund_type": "Equity", "nav": 58.60},
    {"fund_name": "MCB Pakistan Income Fund", "amc_name": "MCB-Arif Habib Savings & Investments", "fund_type": "Income", "nav": 105.30},
    # NBP Funds
    {"fund_name": "NBP Government Securities Fund", "amc_name": "NBP Funds", "fund_type": "Debt", "nav": 110.50},
    {"fund_name": "NBP Stock Fund", "amc_name": "NBP Funds", "fund_type": "Equity", "nav": 48.90},
    {"fund_name": "NBP Money Market Fund", "amc_name": "NBP Funds", "fund_type": "Money Market", "nav": 101.20},
    {"fund_name": "NBP Balanced Fund", "amc_name": "NBP Funds", "fund_type": "Balanced", "nav": 65.80},
    # HBL Asset Management
    {"fund_name": "HBL Cash Fund", "amc_name": "HBL Asset Management", "fund_type": "Money Market", "nav": 102.80},
    {"fund_name": "HBL Stock Fund", "amc_name": "HBL Asset Management", "fund_type": "Equity", "nav": 55.30},
    {"fund_name": "HBL Income Fund", "amc_name": "HBL Asset Management", "fund_type": "Income", "nav": 108.40},
    {"fund_name": "HBL Multi Asset Fund", "amc_name": "HBL Asset Management", "fund_type": "Balanced", "nav": 78.90},
    # UBL Funds
    {"fund_name": "UBL Liquidity Plus Fund", "amc_name": "UBL Fund Managers", "fund_type": "Money Market", "nav": 101.50},
    {"fund_name": "UBL Stock Advantage Fund", "amc_name": "UBL Fund Managers", "fund_type": "Equity", "nav": 62.40},
    {"fund_name": "UBL Government Securities Fund", "amc_name": "UBL Fund Managers", "fund_type": "Debt", "nav": 112.30},
    # Atlas Asset Management
    {"fund_name": "Atlas Money Market Fund", "amc_name": "Atlas Asset Management", "fund_type": "Money Market", "nav": 100.80},
    {"fund_name": "Atlas Stock Market Fund", "amc_name": "Atlas Asset Management", "fund_type": "Equity", "nav": 430.20},
    {"fund_name": "Atlas Income Fund", "amc_name": "Atlas Asset Management", "fund_type": "Income", "nav": 525.60},
    # Faysal Asset Management
    {"fund_name": "Faysal Money Market Fund", "amc_name": "Faysal Asset Management", "fund_type": "Money Market", "nav": 101.10},
    {"fund_name": "Faysal Islamic Stock Fund", "amc_name": "Faysal Asset Management", "fund_type": "Equity", "nav": 42.30},
    # Alfalah GHP
    {"fund_name": "Alfalah GHP Cash Fund", "amc_name": "Alfalah Asset Management", "fund_type": "Money Market", "nav": 100.50},
    {"fund_name": "Alfalah GHP Stock Fund", "amc_name": "Alfalah Asset Management", "fund_type": "Equity", "nav": 57.80},
    {"fund_name": "Alfalah GHP Income Multiplier Fund", "amc_name": "Alfalah Asset Management", "fund_type": "Income", "nav": 106.20},
    # JS Investments
    {"fund_name": "JS Cash Fund", "amc_name": "JS Investments", "fund_type": "Money Market", "nav": 102.30},
    {"fund_name": "JS Growth Fund", "amc_name": "JS Investments", "fund_type": "Equity", "nav": 158.40},
    {"fund_name": "JS Islamic Fund", "amc_name": "JS Investments", "fund_type": "Equity", "nav": 98.70},
]


async def fetch_mufap_data(db: Session) -> None:
    try:
        await _fetch_live(db)
    except Exception as e:
        logger.warning(f"MUFAP live fetch failed ({e}), seeding with static data")
        _seed_data(db)


async def _fetch_live(db: Session) -> None:
    async with httpx.AsyncClient(timeout=30, headers=HEADERS) as client:
        response = await client.get(MUFAP_URL)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table", {"id": "table-announcement"}) or soup.find("table")
    if not table:
        raise ValueError("NAV table not found on MUFAP page")

    rows = table.find_all("tr")
    parsed_rows: list[dict] = []
    for row in rows:
        cols = [td.get_text(strip=True) for td in row.find_all("td")]
        if len(cols) < 9:
            continue

        # Tab=3 columns:
        # Sector, AMC, Fund, Category, Inception Date, Offer, Repurchase, NAV, Validity Date, ...
        amc_name = cols[1]
        fund_name = cols[2]
        fund_type = cols[3]
        offer_price = _parse_float(cols[5])
        redemption_price = _parse_float(cols[6])
        nav_val = _parse_float(cols[7])
        nav_date = cols[8]

        # Some MUFAP rows show NAV as 0.0000 while repurchase/offer carry
        # the usable daily value. Prefer NAV, then repurchase, then offer.
        effective_nav = nav_val
        if not effective_nav or effective_nav <= 0:
            effective_nav = redemption_price if redemption_price and redemption_price > 0 else offer_price

        if not fund_name:
            continue

        parsed_rows.append(
            {
                "fund_name": fund_name,
                "amc_name": amc_name,
                "fund_type": fund_type,
                "offer_price": offer_price,
                "redemption_price": redemption_price,
                "current_nav": effective_nav,
                "nav_date": nav_date,
            }
        )

    if not parsed_rows:
        raise ValueError("No MUFAP rows parsed")

    name_counts: dict[str, int] = {}
    for item in parsed_rows:
        key = item["fund_name"]
        name_counts[key] = name_counts.get(key, 0) + 1

    updated = 0
    for item in parsed_rows:
        base_name = item["fund_name"]
        fund_name = (
            base_name
            if name_counts.get(base_name, 0) == 1
            else f"{base_name} ({item['amc_name']} - {item['fund_type']})"
        )

        cache = db.query(MutualFundNAVCache).filter(MutualFundNAVCache.fund_name == fund_name).first()
        if cache:
            # Preserve last valid NAV if MUFAP publishes zeros for the day.
            if item["current_nav"] and item["current_nav"] > 0:
                cache.current_nav = item["current_nav"]
            cache.nav_date = item["nav_date"]
            cache.amc_name = item["amc_name"]
            cache.fund_type = item["fund_type"]
            if item["offer_price"] and item["offer_price"] > 0:
                cache.offer_price = item["offer_price"]
            if item["redemption_price"] and item["redemption_price"] > 0:
                cache.redemption_price = item["redemption_price"]
        else:
            db.add(MutualFundNAVCache(
                fund_name=fund_name,
                amc_name=item["amc_name"],
                fund_type=item["fund_type"],
                current_nav=item["current_nav"],
                nav_date=item["nav_date"],
                offer_price=item["offer_price"],
                redemption_price=item["redemption_price"],
            ))
        updated += 1

    db.commit()
    logger.info(f"MUFAP data updated: {updated} funds")


def _seed_data(db: Session) -> None:
    for fund in SEED_FUNDS:
        cache = db.query(MutualFundNAVCache).filter(MutualFundNAVCache.fund_name == fund["fund_name"]).first()
        if not cache:
            db.add(MutualFundNAVCache(
                fund_name=fund["fund_name"],
                amc_name=fund["amc_name"],
                fund_type=fund["fund_type"],
                current_nav=fund["nav"],
                offer_price=round(fund["nav"] * 1.015, 2),
                redemption_price=round(fund["nav"] * 0.99, 2),
            ))
    db.commit()
    logger.info("MUFAP seed data loaded")


def _parse_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return None
