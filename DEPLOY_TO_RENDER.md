# 🚀 Deploy Backend to Render (FREE & SECURE)

## Why Render?

- ✅ **FREE tier** with PostgreSQL database included
- ✅ **Automatic HTTPS/SSL** (encrypted connection)
- ✅ **Auto-deploy** from GitHub
- ✅ **Easy environment variables** management
- ✅ **PostgreSQL included** in free tier
- ✅ **No credit card required** for free tier

## Step 1: Prepare Your Code

### 1a. Push Code to GitHub (Required for Render)

```powershell
cd "c:\Users\X1 Carbon\Desktop\portfolio app"

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - ready for deployment"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/portfolio-app.git
git push -u origin main
```

### 1b. Create `.gitignore` (Don't push sensitive files)

```
backend/.env
backend/my-release-key.keystore
frontend/android/gradle.properties
frontend/android/my-release-key.keystore
__pycache__
*.pyc
node_modules
.next
venv
env
```

---

## Step 2: Create Render Account

1. Go to: https://render.com
2. Sign up with GitHub (recommended)
3. Authorize Render to access your GitHub account

---

## Step 3: Create PostgreSQL Database

1. In Render dashboard, click **"New +"** → **PostgreSQL**
2. Fill in:
   - **Name**: `pakfinance-db`
   - **Database**: `portfolio_db`
   - **User**: `portfolio`
   - **Region**: Pick closest to you
   - **PostgreSQL Version**: 16
3. Click **Create Database**
4. **Wait 2-3 minutes** for creation

Once created, copy your **Internal Database URL** (you'll need it):

```
postgres://portfolio:PASSWORD@dpg-xxxx.postgres.render.com/portfolio_db
```

---

## Step 4: Create Web Service for Backend

1. Click **"New +"** → **Web Service**
2. Select your GitHub repo: `portfolio-app`
3. Configure:
   - **Name**: `pakfinance-api`
   - **Runtime**: Python 3
   - **Build Command**:
     ```
     pip install -r backend/requirements.txt && cd backend && alembic upgrade head
     ```
   - **Start Command**:
     ```
     cd backend && gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
     ```
   - **Region**: Same as your database
   - **Plan**: Free (it will show 0.00/month)

4. Click **Create Web Service**

---

## Step 5: Add Environment Variables

1. In your web service dashboard, go to **Environment**
2. Add these variables:

```
DATABASE_URL = postgresql://portfolio:PASSWORD@dpg-xxxx.postgres.render.com/portfolio_db
SECRET_KEY = generate-a-random-string-32-characters-or-more
ALGORITHM = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30
CORS_ORIGINS = ["https://your-frontend.com", "https://your-other-domain.com"]
ENVIRONMENT = production
WEBAUTHN_RP_ID = your-domain.com
WEBAUTHN_RP_NAME = PakFinance
WEBAUTHN_ORIGIN = https://your-frontend.com
PYTHONUNBUFFERED = 1
```

### Generate SECRET_KEY

```powershell
# Run in PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object {[byte](Get-Random -Minimum 0 -Maximum 256)}))
```

---

## Step 6: Deploy!

1. After adding env variables, Render **automatically deploys**
2. Wait for build to complete (watch logs)
3. Once deployed, you'll get a URL like:
   ```
   https://pakfinance-api.onrender.com
   ```

---

## Step 7: Test Your Backend

```powershell
# Test the API is running
Invoke-WebRequest https://pakfinance-api.onrender.com/health

# You should see: {"status": "healthy", "version": "1.0.0"}
```

---

## Step 8: Update Your Frontend APK

Update your `gradle.properties` in `frontend/android/`:

```properties
NEXT_PUBLIC_API_URL=https://pakfinance-api.onrender.com
```

Then rebuild the APK:

```powershell
cd frontend\android
.\gradlew.bat assembleRelease
```

---

## Security Best Practices

### ✅ What's Secure:

- **HTTPS/SSL**: Automatic (green padlock 🔒)
- **Database**: Private PostgreSQL instance
- **Environment Variables**: Encrypted and isolated
- **No exposed secrets**: Never commit .env files

### ⚠️ Important Security Steps:

1. **Never commit sensitive files**:

   ```
   backend/.env
   backend/my-release-key.keystore
   frontend/android/gradle.properties
   ```

2. **Rotate your SECRET_KEY monthly** in production

3. **Use strong passwords** for database (Render generates these)

4. **Enable CORS properly**:

   ```
   CORS_ORIGINS = ["https://your-real-domain.com"]
   ```

   Don't use `*` in production

5. **Disable debug mode**:
   ```
   ENVIRONMENT = production
   ```

---

## Monitoring & Logs

1. In Render dashboard, go to **Logs**
2. See real-time server logs
3. Check for errors or issues

---

## Common Issues & Solutions

### ❌ Build fails: "requirements.txt not found"

**Fix**: Ensure your repo structure is correct. The backend/requirements.txt must exist.

### ❌ Database connection error

**Fix**:

- Verify DATABASE_URL is correct
- Make sure database is in same region
- Check credentials match what you set

### ❌ "Cold start" taking too long

**Fix**: This is normal on free tier. Upgrade to paid for faster starts.

### ❌ APK can't connect to backend

**Fix**:

- Verify CORS_ORIGINS includes your domain
- Check that API_URL in APK is correct (https://...)

---

## Upgrade to Paid (Optional)

If your app grows:

- **Free tier**: ~500 compute hours/month (adequate for testing)
- **Paid tier**: Starts at $7/month (professional use)

To upgrade: Dashboard → Plan → Upgrade to Starter

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Update APK with production API URL
3. ✅ Test API from your Android app
4. ✅ Deploy frontend (optional - can use APK only)

**Your backend is now:**

- 🌍 Accessible worldwide
- 🔒 Secured with HTTPS
- 💾 Using PostgreSQL database
- 💰 Completely FREE

---

## Need Help?

Common questions:

- **"How do I update my backend?"** → Push to GitHub, Render auto-deploys
- **"Can I use a custom domain?"** → Yes, upgrade plan or use Render subdomain
- **"How much does it cost?"** → Free for small projects, $7+/month for production
- **"Is it secure?"** → Yes! HTTPS, encrypted vars, isolated database

---

**Deployment Status**: Once you see "Service is live" → Your backend is ready! 🎉
