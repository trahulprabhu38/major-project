#!/bin/bash

# Flames.blue Development Startup Script
# This script starts all services in the correct order

set -e  # Exit on error

echo "🔥 Starting Flames.blue OBE Platform..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo -e "${BLUE}📦 Building and starting all services...${NC}"
docker-compose up --build -d

echo ""
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check PostgreSQL
echo -ne "${BLUE}   Checking PostgreSQL... ${NC}"
until docker exec postgres pg_isready -U admin -d edu > /dev/null 2>&1; do
    echo -ne "."
    sleep 2
done
echo -e "${GREEN}✓${NC}"

# Check MongoDB
echo -ne "${BLUE}   Checking MongoDB... ${NC}"
until docker exec mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    echo -ne "."
    sleep 2
done
echo -e "${GREEN}✓${NC}"

# Check Backend
echo -ne "${BLUE}   Checking Backend API... ${NC}"
until curl -s http://localhost:8080/health > /dev/null 2>&1; do
    echo -ne "."
    sleep 2
done
echo -e "${GREEN}✓${NC}"

# Check FastAPI Upload Service
echo -ne "${BLUE}   Checking Upload Service... ${NC}"
until curl -s http://localhost:8001/health > /dev/null 2>&1; do
    echo -ne "."
    sleep 2
done
echo -e "${GREEN}✓${NC}"

# Check Frontend
echo -ne "${BLUE}   Checking Frontend... ${NC}"
until curl -s http://localhost:5173 > /dev/null 2>&1; do
    echo -ne "."
    sleep 2
done
echo -e "${GREEN}✓${NC}"

echo ""
echo -e "${GREEN}✅ All services are running!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📱 Access the application:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  🌐 Frontend:           ${GREEN}http://localhost:5173${NC}"
echo -e "  🔌 Backend API:        ${GREEN}http://localhost:8080${NC}"
echo -e "  📤 Upload Service:     ${GREEN}http://localhost:8001${NC}"
echo -e "  📚 Upload API Docs:    ${GREEN}http://localhost:8001/docs${NC}"
echo -e "  🗄️  PostgreSQL:         ${GREEN}localhost:5432${NC}"
echo -e "  🍃 MongoDB:            ${GREEN}localhost:27018${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  View logs:             docker-compose logs -f"
echo "  Stop services:         docker-compose down"
echo "  Restart service:       docker-compose restart [service_name]"
echo "  Database shell:        docker exec -it postgres psql -U admin -d edu"
echo ""
echo -e "${YELLOW}💡 Tip: See FASTAPI_INTEGRATION_GUIDE.md for testing instructions${NC}"
echo ""
