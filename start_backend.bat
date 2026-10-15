@echo off
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
  echo Python virtual environment not found. See README.md.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -m uvicorn main:app --reload
pause
