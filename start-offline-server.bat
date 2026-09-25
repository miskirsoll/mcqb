@echo off
rem Double-click to share the site on your local network (no internet needed).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org ^(LTS^), then run this again.
  pause
  exit /b 1
)
node scripts\build.js
if errorlevel 1 (
  pause
  exit /b 1
)
node scripts\serve.js 8080
pause
