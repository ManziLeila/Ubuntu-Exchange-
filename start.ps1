# GlobalTransact Startup Script (Windows PowerShell)
# Run: powershell -ExecutionPolicy Bypass -File start.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GlobalTransact - Starting Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "[SUCCESS] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "[INFO] Created logs directory" -ForegroundColor Yellow
}

Write-Host "[INFO] Starting database and cache services..." -ForegroundColor Cyan
docker-compose up -d postgres redis
Write-Host "[SUCCESS] Database and cache services started" -ForegroundColor Green

Write-Host "[INFO] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check database health
$dbReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $result = docker exec globaltransact-postgres-1 pg_isready -U gt_user -d globaltransact 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] PostgreSQL is ready" -ForegroundColor Green
            $dbReady = $true
            break
        }
    } catch {
        # Continue waiting
    }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 1
}

if (-not $dbReady) {
    Write-Host "[WARNING] Could not verify database is ready, proceeding anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[INFO] Running database migrations..." -ForegroundColor Yellow
Push-Location services/core
npm run db:push
Pop-Location
Write-Host "[SUCCESS] Database migrations completed" -ForegroundColor Green

Write-Host ""
Write-Host "[INFO] Starting services..." -ForegroundColor Cyan
Write-Host ""

# Function to start service in new window
function Start-ServiceWindow {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [string]$Command
    )
    Write-Host "[INFO] Starting $ServiceName..." -ForegroundColor Yellow
    $scriptBlock = {
        param($Path, $Cmd)
        Set-Location $Path
        Invoke-Expression $Cmd
    }
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ServicePath'; $Command"
}

# Start services
Start-ServiceWindow -ServiceName "Core API Service" -ServicePath (Join-Path (Get-Location) "services/core") -Command "npm run dev"
Start-Sleep -Seconds 1

Start-ServiceWindow -ServiceName "Forex Service" -ServicePath (Join-Path (Get-Location) "services/forex") -Command "npm start"
Start-Sleep -Seconds 1

Start-ServiceWindow -ServiceName "Web Frontend" -ServicePath (Join-Path (Get-Location) "web") -Command "npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[SUCCESS] All services are starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Service Status:" -ForegroundColor Yellow
Write-Host "  PostgreSQL:    Running (Port 5437)" -ForegroundColor Green
Write-Host "  Redis:         Running (Port 6379)" -ForegroundColor Green
Write-Host "  Core API:      Starting (Port 3001)" -ForegroundColor Yellow
Write-Host "  Forex Service: Starting (Port 3002)" -ForegroundColor Yellow
Write-Host "  Web App:       Starting (Port 3000)" -ForegroundColor Yellow
Write-Host ""

Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  Check API health: curl http://localhost:3001/healthz"
Write-Host "  Stop all:         npm run stop"
Write-Host "  View logs:        docker-compose logs -f"
Write-Host ""

Write-Host "Ready to go! Open http://localhost:3000 in your browser" -ForegroundColor Green
Write-Host ""

Write-Host "Press Ctrl+C to stop services..."
Read-Host "Press Enter when done to close this window"
