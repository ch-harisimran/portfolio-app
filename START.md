# PakFinance — Quick Start Guide

## Development (Local)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env         # Edit DATABASE_URL if needed
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
# Create .env.local:
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
npm run dev
```
App: http://localhost:3000

### Database (local PostgreSQL required)
```sql
CREATE DATABASE portfolio_db;
CREATE USER portfolio WITH PASSWORD 'password';
GRANT ALL ON DATABASE portfolio_db TO portfolio;
```
Tables are auto-created on first backend startup.

---

## Docker (Recommended)

```bash
# Development
docker compose up -d

# Production (with nginx + SSL)
cp .env.example .env
# Edit .env with your values
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## First Run

1. Open http://localhost:3000
2. Click **Create account** and register
3. Dashboard loads — data refreshes automatically
4. Go to **Settings** to set a PIN for quick access
5. Add your first stock: **PSX Stocks → Add Stock → search symbol**
6. Add mutual funds: **Mutual Funds → Add Fund → search by AMC/name**

---

## Features

| Module | Features |
|--------|----------|
| Dashboard | Net worth, P&L cards, portfolio chart, allocation donut |
| PSX Stocks | Add/close trades, live prices, unrealized P&L |
| Mutual Funds | Add/redeem, NAV tracking, P&L |
| Goals | Create goals, track contributions, progress bars |
| Loans | Add loans, record repayments, timeline chart |
| History | All closed trades with realized P&L |
| Settings | Profile, PIN management, market data refresh |

---

## Market Data

- **PSX Stocks**: Auto-fetched every 15 min (weekdays 9:30–15:30 PKT) from DPS API
- **Mutual Fund NAVs**: Auto-fetched daily at 6 PM PKT from MUFAP
- Both fall back to seed data if APIs are unavailable (development)

---

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Recharts
- **Backend**: FastAPI, SQLAlchemy, APScheduler
- **Database**: PostgreSQL 16
- **Auth**: JWT (access + refresh tokens) + PIN-based quick lock
- **Deploy**: Docker Compose + Nginx
