@echo off
chcp 65001 >nul
title פורטל אאורה

echo מפעיל שרת Backend...
start "Backend" cmd /k "cd /d "%~dp0backend" && uvicorn main:app --reload --port 8001"

timeout /t 2 /nobreak >nul

echo מפעיל שרת Frontend...
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 4 /nobreak >nul

echo פותח דפדפן...
start http://localhost:5174

exit