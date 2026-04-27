@echo off
REM Create a keystore for Android APK signing
REM This script generates a keystore for release APK signing

echo Creating Android Keystore for Release APK...
echo.

REM Find keytool in Java installation
for /f "tokens=*" %%A in ('where keytool 2^>nul') do set KEYTOOL_PATH=%%A

if not defined KEYTOOL_PATH (
    REM Try common Java installation paths
    if exist "C:\Program Files\Java\jdk-22\bin\keytool.exe" (
        set KEYTOOL_PATH=C:\Program Files\Java\jdk-22\bin\keytool.exe
    ) else if exist "C:\Program Files\Java\jdk22\bin\keytool.exe" (
        set KEYTOOL_PATH=C:\Program Files\Java\jdk22\bin\keytool.exe
    ) else (
        echo Error: Could not find keytool. Please ensure Java JDK is installed.
        pause
        exit /b 1
    )
)

echo Found keytool at: %KEYTOOL_PATH%
echo.
echo This will create a keystore file for signing your release APK.
echo You will be prompted to enter information and a password.
echo.
echo IMPORTANT: 
echo - Remember your password! You'll need it to build releases.
echo - Save it in a safe location - don't lose it.
echo.
pause

"%KEYTOOL_PATH%" -genkey -v -keystore my-release-key.keystore ^
    -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Keystore created: my-release-key.keystore
    echo.
    echo Next steps:
    echo 1. Create a file named 'gradle.properties' in this directory
    echo 2. Add your signing credentials to it
    echo 3. Run: gradlew.bat assembleRelease
) else (
    echo Error creating keystore!
)

pause
