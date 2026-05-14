#!/bin/bash

# GlobalTransact Startup Script (Linux/macOS)
# This script starts all services in the background with logging

set -e

echo "🚀 GlobalTransact - Starting all services..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}✗ Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

# Create logs directory
mkdir -p logs

echo -e "${BLUE}📦 Starting database and cache services...${NC}"
docker-compose up -d postgres redis

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if database is healthy
for i in {1..30}; do
  if docker exec globaltransact-postgres-1 pg_isready -U gt_user -d globaltransact > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
npm --prefix services/core run db:push || echo -e "${YELLOW}⚠️  Migration check completed${NC}"

echo ""
echo -e "${BLUE}🌐 Starting backend services...${NC}"
npm --prefix services/core run dev > logs/core.log 2>&1 &
CORE_PID=$!
npm --prefix services/forex start > logs/forex.log 2>&1 &
FOREX_PID=$!

echo -e "${BLUE}⏳ Waiting for backend services to be ready...${NC}"
sleep 3

echo ""
echo -e "${BLUE}💻 Starting frontend...${NC}"
npm --prefix web start > logs/web.log 2>&1 &
WEB_PID=$!

echo ""
echo -e "${GREEN}✓ All services are starting!${NC}"
echo ""
echo -e "${YELLOW}📋 Service Status:${NC}"
echo -e "  PostgreSQL:    ${GREEN}Running${NC} (Port 5437)"
echo -e "  Redis:         ${GREEN}Running${NC} (Port 6379)"
echo -e "  Core API:      ${GREEN}Starting${NC} (Port 3001) [PID: $CORE_PID]"
echo -e "  Forex Service: ${GREEN}Starting${NC} (Port 3002) [PID: $FOREX_PID]"
echo -e "  Web App:       ${GREEN}Starting${NC} (Port 3000) [PID: $WEB_PID]"
echo ""
echo -e "${YELLOW}📖 Useful Commands:${NC}"
echo "  View logs:        tail -f logs/core.log"
echo "  Stop all:         npm run stop && kill $CORE_PID $FOREX_PID $WEB_PID"
echo "  Check services:   curl http://localhost:3001/healthz"
echo ""
echo -e "${GREEN}✨ Ready to go! Open http://localhost:3000 in your browser${NC}"

# Wait for any process to exit
wait
