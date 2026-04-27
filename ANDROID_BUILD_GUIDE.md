# Building a Release APK for Your Portfolio App

This guide will help you create a signed release APK that you can distribute and use worldwide.

## Prerequisites

- Java JDK 22+ installed
- Android SDK installed (should already be set up from Capacitor)
- Your Next.js frontend already built

## Step 1: Create a Keystore for Signing (One-time Setup)

The keystore is used to sign your APK. You only need to do this once!

### Option A: Using the Script (Recommended for Windows)

```powershell
cd frontend\android
.\create-keystore.bat
```

Follow the prompts:

- **First and last name**: Your name
- **Organization unit**: Leave blank or enter something
- **Organization**: Your organization
- **City/Locality**: Your city
- **State/Province**: Your state
- **Country Code**: Your country code (e.g., US, PK)
- **Keystore password**: Create a strong password (e.g., MySecurePass123!)
- **Key password**: Use the same password or different
- **Validity**: Press Enter to accept 10000 days

**This creates: `frontend/android/my-release-key.keystore`**

### Option B: Manual Generation (If Script Fails)

Open PowerShell and run:

```powershell
cd "c:\Users\X1 Carbon\Desktop\portfolio app\frontend\android"

# Replace path to keytool if Java is in different location
& "C:\Program Files\Java\jdk-22\bin\keytool.exe" -genkey -v -keystore my-release-key.keystore `
    -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

## Step 2: Configure Gradle Signing

1. Navigate to: `frontend\android\`

2. Copy the template:

```powershell
Copy-Item gradle.properties.template gradle.properties
```

3. Edit `gradle.properties` and fill in your credentials:

```properties
KEYSTORE_FILE=my-release-key.keystore
KEYSTORE_PASSWORD=your_keystore_password_here
KEY_ALIAS=my-key-alias
KEY_PASSWORD=your_key_password_here
NEXT_PUBLIC_API_URL=https://your-production-backend.com/api
```

**⚠️ IMPORTANT**: Never commit gradle.properties to Git! Add to .gitignore:

```
gradle.properties
my-release-key.keystore
```

## Step 3: Prepare the Frontend Build

```powershell
cd frontend
npm run build
npx cap sync android
```

## Step 4: Build the Release APK

```powershell
cd frontend\android

# Debug APK (for testing)
.\gradlew.bat assembleDebug

# OR Release APK (for production - requires gradle.properties)
.\gradlew.bat assembleRelease
```

## Step 5: Locate Your APK

The APK will be in:

- **Debug**: `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (Testing)
- **Release**: `frontend/android/app/build/outputs/apk/release/app-release.apk` (Production)

## Step 6: Install on Your Android Device

### Option A: Using ADB (via USB Cable)

```powershell
adb install path/to/app-release.apk
```

### Option B: Direct File Transfer

1. Email or upload the APK to cloud storage (Google Drive, Dropbox, etc.)
2. Download on your Android phone
3. Tap to install (may need to enable "Install from unknown sources" in Settings)

### Option C: USB File Transfer

1. Connect phone via USB
2. Copy APK to phone storage
3. Use a file manager to tap and install

## Step 7: Configure Backend URL

To use your app worldwide, you need a backend server accessible from the internet:

### Option A: Cloud Deployment (Recommended)

- Deploy your backend to: AWS, Azure, Google Cloud, Heroku, DigitalOcean, etc.
- Update `gradle.properties` with your server URL:
  ```
  NEXT_PUBLIC_API_URL=https://your-api-server.com
  ```
- Rebuild the APK

### Option B: Local Network (Development Only)

If using local network:

```
NEXT_PUBLIC_API_URL=http://192.168.x.x:8000
```

## Troubleshooting

### "keytool not found"

Add Java to PATH or use full path:

```powershell
& "C:\Program Files\Java\jdk-22\bin\keytool.exe" -version
```

### Build fails with signing error

- Verify gradle.properties has correct passwords
- Ensure keystore file path is correct and relative to android/ directory

### APK too large

- Check that `minifyEnabled true` in release build
- Remove unused dependencies

### App can't connect to backend

- Verify API URL is accessible from your phone's network
- Check backend server is running
- Verify CORS settings allow your app's domain

## Security Notes

⚠️ **Never share your keystore file or gradle.properties**

- Store keystore in a safe location
- Don't commit to version control
- Back it up safely - losing it means you can't update your app

## For Worldwide Distribution (Play Store)

To publish on Google Play Store:

1. Create a Google Play Developer account ($25 one-time)
2. Sign app with this release key
3. Upload to Play Store
4. Follow their submission guidelines

The APK you've just created is ready for:

- Beta testing
- Direct distribution to friends
- Corporate deployment
- Play Store submission

---

**Need help?** Let me know if you hit any issues!
