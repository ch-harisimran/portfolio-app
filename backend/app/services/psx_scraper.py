"""
PSX market data fetcher.
Primary source: DPS PSX market-watch page + symbols endpoint.
Fallback: static seed data for offline development.
"""
import httpx
import logging
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from ..models.market_data import StockPriceCache

logger = logging.getLogger(__name__)

PSX_MARKET_WATCH_URL = "https://dps.psx.com.pk/market-watch"
PSX_SYMBOLS_URL = "https://dps.psx.com.pk/symbols"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://dps.psx.com.pk/",
}

# Seed data for development / when API is unreachable
SEED_STOCKS = [
    {"symbol": "OGDC", "company_name": "Oil & Gas Development Company", "sector": "Energy", "price": 175.50},
    {"symbol": "PPL", "company_name": "Pakistan Petroleum Limited", "sector": "Energy", "price": 82.30},
    {"symbol": "HBL", "company_name": "Habib Bank Limited", "sector": "Banks", "price": 145.00},
    {"symbol": "UBL", "company_name": "United Bank Limited", "sector": "Banks", "price": 195.75},
    {"symbol": "MCB", "company_name": "MCB Bank Limited", "sector": "Banks", "price": 220.00},
    {"symbol": "LUCK", "company_name": "Lucky Cement", "sector": "Cement", "price": 520.00},
    {"symbol": "DGKC", "company_name": "DG Khan Cement", "sector": "Cement", "price": 68.50},
    {"symbol": "EFERT", "company_name": "Engro Fertilizers", "sector": "Fertilizer", "price": 88.00},
    {"symbol": "ENGRO", "company_name": "Engro Corporation", "sector": "Conglomerate", "price": 305.00},
    {"symbol": "FFC", "company_name": "Fauji Fertilizer Company", "sector": "Fertilizer", "price": 115.00},
    {"symbol": "NESTLE", "company_name": "Nestle Pakistan", "sector": "Food & Personal Care", "price": 6500.00},
    {"symbol": "COLG", "company_name": "Colgate-Palmolive Pakistan", "sector": "Food & Personal Care", "price": 2350.00},
    {"symbol": "PSO", "company_name": "Pakistan State Oil", "sector": "Energy", "price": 310.00},
    {"symbol": "SNGP", "company_name": "Sui Northern Gas Pipelines", "sector": "Energy", "price": 42.00},
    {"symbol": "KEL", "company_name": "K-Electric Limited", "sector": "Power", "price": 4.80},
    {"symbol": "HUBC", "company_name": "Hub Power Company", "sector": "Power", "price": 120.00},
    {"symbol": "KAPCO", "company_name": "Kot Addu Power Company", "sector": "Power", "price": 55.00},
    {"symbol": "MARI", "company_name": "Mari Petroleum Company", "sector": "Energy", "price": 1450.00},
    {"symbol": "POL", "company_name": "Pakistan Oilfields Limited", "sector": "Energy", "price": 520.00},
    {"symbol": "TRG", "company_name": "TRG Pakistan", "sector": "Technology", "price": 88.00},
    {"symbol": "SYS", "company_name": "Systems Limited", "sector": "Technology", "price": 320.00},
    {"symbol": "NETSOL", "company_name": "NetSol Technologies", "sector": "Technology", "price": 195.00},
    {"symbol": "MEBL", "company_name": "Meezan Bank", "sector": "Banks", "price": 155.00},
    {"symbol": "BAHL", "company_name": "Bank AL Habib", "sector": "Banks", "price": 52.00},
    {"symbol": "ABL", "company_name": "Allied Bank", "sector": "Banks", "price": 88.00},
    {"symbol": "BAFL", "company_name": "Bank Alfalah", "sector": "Banks", "price": 44.00},
    {"symbol": "FCCL", "company_name": "Fauji Cement Company", "sector": "Cement", "price": 22.50},
    {"symbol": "MLCF", "company_name": "Maple Leaf Cement Factory", "sector": "Cement", "price": 36.00},
    {"symbol": "PIOC", "company_name": "Pioneer Cement", "sector": "Cement", "price": 95.00},
    {"symbol": "KTML", "company_name": "Kohinoor Textile Mills", "sector": "Textile", "price": 52.00},
]


async def fetch_psx_data(db: Session) -> None:
    """Fetch live PSX data; fall back to seed on failure."""
    try:
        await _fetch_live(db)
    except Exception as e:
        logger.warning(f"PSX live fetch failed ({e}), seeding with static data")
        _seed_data(db)


async def _fetch_live(db: Session) -> None:
    async with httpx.AsyncClient(timeout=30, headers=HEADERS) as client:
        symbols_res = await client.get(PSX_SYMBOLS_URL)
        symbols_res.raise_for_status()
        symbols_data = symbols_res.json()

        watch_res = await client.get(PSX_MARKET_WATCH_URL)
        watch_res.raise_for_status()
        market_rows = _parse_market_watch_rows(watch_res.text)

    if not isinstance(symbols_data, list):
        raise ValueError("Unexpected PSX symbols response format")

    symbols_map: dict[str, dict] = {}
    for item in symbols_data:
        symbol = str(item.get("symbol") or "").strip().upper()
        if not symbol:
            continue
        symbols_map[symbol] = item

    rows_map = {row["symbol"]: row for row in market_rows}
    universe = sorted(set(symbols_map.keys()) | set(rows_map.keys()))
    if not universe:
        raise ValueError("No symbols found from DPS")

    for symbol in universe:
        sym_meta = symbols_map.get(symbol, {})
        row = rows_map.get(symbol, {})

        company_name = (
            sym_meta.get("name")
            or row.get("company_name")
            or symbol
        )
        sector = (
            row.get("sector")
            or sym_meta.get("sectorName")
            or ("ETF" if sym_meta.get("isETF") else None)
        )

        current_price = row.get("current_price")
        prev_close = row.get("prev_close")
        change = row.get("change")
        change_pct = row.get("change_percent")
        volume = row.get("volume")
        open_price = row.get("open_price")
        high_price = row.get("high_price")
        low_price = row.get("low_price")

        cache = db.query(StockPriceCache).filter(StockPriceCache.symbol == symbol).first()
        if cache:
            cache.company_name = company_name
            cache.sector = sector
            cache.current_price = current_price
            cache.open_price = open_price
            cache.high_price = high_price
            cache.low_price = low_price
            cache.prev_close = prev_close
            cache.change = change
            cache.change_percent = change_pct
            cache.volume = volume
        else:
            db.add(
                StockPriceCache(
                    symbol=symbol,
                    company_name=company_name,
                    sector=sector,
                    current_price=current_price,
                    open_price=open_price,
                    high_price=high_price,
                    low_price=low_price,
                    prev_close=prev_close,
                    change=change,
                    change_percent=change_pct,
                    volume=volume,
                )
            )
    db.commit()
    logger.info(f"PSX data updated: {len(universe)} symbols")


def _seed_data(db: Session) -> None:
    for stock in SEED_STOCKS:
        cache = db.query(StockPriceCache).filter(StockPriceCache.symbol == stock["symbol"]).first()
        if not cache:
            db.add(StockPriceCache(
                symbol=stock["symbol"],
                company_name=stock["company_name"],
                sector=stock["sector"],
                current_price=stock["price"],
                prev_close=stock["price"] * 0.99,
                change=stock["price"] * 0.01,
                change_percent=1.0,
            ))
    db.commit()
    logger.info("PSX seed data loaded")


def _parse_float(val) -> float | None:
    if val is None:
        return None
    try:
        cleaned = (
            str(val)
            .replace(",", "")
            .replace("%", "")
            .strip()
        )
        if cleaned in {"", "-", "—", "N/A", "n/a"}:
            return None
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _parse_market_watch_rows(html_text: str) -> list[dict]:
    soup = BeautifulSoup(html_text, "html.parser")
    table = soup.select_one("table.tbl") or soup.find("table")
    if not table:
        return []

    body = table.find("tbody") or table
    rows = body.find_all("tr")
    parsed: list[dict] = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 11:
            continue

        symbol_text = cols[0].get_text(" ", strip=True)
        symbol = (symbol_text.split()[0] if symbol_text else "").upper()
        if not symbol:
            continue

        parsed.append(
            {
                "symbol": symbol,
                "company_name": cols[0].get_text(" ", strip=True),
                "sector": cols[1].get_text(" ", strip=True) or None,
                "prev_close": _parse_float(cols[3].get_text(" ", strip=True)),
                "open_price": _parse_float(cols[4].get_text(" ", strip=True)),
                "high_price": _parse_float(cols[5].get_text(" ", strip=True)),
                "low_price": _parse_float(cols[6].get_text(" ", strip=True)),
                "current_price": _parse_float(cols[7].get_text(" ", strip=True)),
                "change": _parse_float(cols[8].get_text(" ", strip=True)),
                "change_percent": _parse_float(cols[9].get_text(" ", strip=True)),
                "volume": _parse_float(cols[10].get_text(" ", strip=True)),
            }
        )

    return parsed
