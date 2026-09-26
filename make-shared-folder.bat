@echo off
rem Double-click to create "shared-folder-site": a copy of the site that opens
rem straight from a shared folder (\\server\share) - no web server needed.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org ^(LTS^), then run this again.
  pause
  exit /b 1
)
node scripts\build.js --folder
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo Done. Copy the "shared-folder-site" folder to the shared drive.
echo People open index.html inside it with their browser.
echo.
start "" "%~dp0shared-folder-site"
pause
