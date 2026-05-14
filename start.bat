@echo off
REM GlobalTransact Startup Script (Windows)
REM This script starts all services in separate windows

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  GlobalTransact - Starting Services
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Create logs directory
if not exist logs mkdir logs

echo [INFO] Starting database and cache services...
docker-compose up -d postgres redis

REM Wait for database
echo [INFO] Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak

echo [INFO] Checking database health...
for /L %%i in (1,1,30) do (
    docker exec globaltransact-postgres-1 pg_isready -U gt_user -d globaltransact >nul 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] PostgreSQL is ready
        goto db_ready
    )
    timeout /t 1 /nobreak >nul
)

:db_ready
echo [INFO] Running database migrations...
cd services\core
call npm run db:push
cd ..\..

echo.
echo [INFO] Starting services in separate windows...
echo.

REM Start Core Service
echo [INFO] Starting Core API Service (Port 3001)...
start "GlobalTransact - Core API" cmd /k "cd services\core && npm run dev"

REM Start Forex Service
echo [INFO] Starting Forex Service (Port 3002)...
start "GlobalTransact - Forex" cmd /k "cd services\forex && npm start"

REM Start Web Frontend
echo [INFO] Starting Web Frontend (Port 3000)...
start "GlobalTransact - Web" cmd /k "cd web && npm start"

echo.
echo ========================================
echo [SUCCESS] All services are starting!
echo ========================================
echo.
echo Service Status:
echo   PostgreSQL:    Running (Port 5437)
echo   Redis:         Running (Port 6379)
echo   Core API:      Starting (Port 3001)
echo   Forex Service: Starting (Port 3002)
echo   Web App:       Starting (Port 3000)
echo.
echo Useful Commands:
echo   Check API health: curl http://localhost:3001/healthz
echo   Stop all:         npm run stop
echo   View logs:        docker-compose logs -f
echo.
echo Ready to go! Open http://localhost:3000 in your browser
echo.
pause
