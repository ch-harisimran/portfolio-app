# PakFinance Quick Start Guide

## Development (Local)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### Web App
```bash
npm install
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
Tables are auto-created on backend startup.

## First Run

1. Open http://localhost:3000
2. Register an account
3. Add your first stock or mutual fund
4. Open Settings to manage your profile, PIN, and market data refresh

## Market Data

- PSX stocks refresh every 15 minutes during market hours.
- MUFAP NAVs refresh daily.
- On Vercel, those refreshes run through cron jobs instead of a persistent scheduler.

## Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, Recharts
- Backend: FastAPI, SQLAlchemy
- Database: PostgreSQL
- Auth: JWT plus PIN and WebAuthn unlock
- Deploy: Vercel
