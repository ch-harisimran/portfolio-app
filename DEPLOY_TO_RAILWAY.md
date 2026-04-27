# 🚀 Alternative: Deploy to Railway (Also FREE & Easy)

## Why Railway?

- ✅ **$5/month free credit** (enough for most projects)
- ✅ **Simple UI** - easier than Render for some
- ✅ **PostgreSQL included**
- ✅ **Auto-deploy** from GitHub
- ✅ **Automatic HTTPS**

## Quick Deploy Steps

### 1. Create Railway Account

Go to: https://railway.app
Sign up with GitHub

### 2. Create New Project

- Click **"New Project"**
- Select **"Deploy from GitHub repo"**
- Authorize and select your portfolio app repo

### 3. Add PostgreSQL Database

- Click **"Add Services"** → **PostgreSQL**
- Railway creates it automatically

### 4. Configure Backend Service

- Add service from your repo
- Settings → **Root Directory**: `backend/`
- Build command:
  ```
  pip install -r requirements.txt && alembic upgrade head
  ```
- Start command:
  ```
  gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker
  ```

### 5. Add Environment Variables

In Variables tab, add all the env vars from DEPLOY_TO_RENDER.md

### 6. Deploy!

Click deploy, wait for success. Your URL will be shown.

---

## Render vs Railway

| Feature         | Render         | Railway            |
| --------------- | -------------- | ------------------ |
| Free Tier       | ✅ Full free   | ✅ $5 credit/month |
| PostgreSQL      | ✅ Free        | ✅ Included        |
| HTTPS           | ✅ Auto        | ✅ Auto            |
| Ease            | 😊 Easy        | 😊 Very easy       |
| Cost after free | $7/month       | After $5 credit    |
| Best for        | Small projects | Learning & testing |

**Recommendation**: Start with **Render** (truly free), upgrade to Railway if you prefer the UI.
