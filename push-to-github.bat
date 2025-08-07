@echo off
echo 🚀 Pushing Deep360 to GitHub...
echo.

REM Set Git path
set PATH=%PATH%;C:\Program Files\Git\bin

REM Check status
echo 📋 Checking Git status...
git status --porcelain

echo.
echo 📡 Remote repository:
git remote -v

echo.
echo 🌿 Current branch:
git branch --show-current

echo.
echo 📤 Pushing to GitHub...
git push -u origin main

echo.
echo ✅ Push completed!
echo 📋 Repository: https://github.com/zyikun0911/deep360
echo.
pause
