#!/bin/bash

# UI Setup Script
# Installs dependencies and starts the development server

set -e

echo "🎨 Setting up the new Upload UI..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo ""
echo -e "${GREEN}✅ Dependencies installed!${NC}"
echo ""
echo -e "${BLUE}🚀 Starting development server...${NC}"
echo ""
npm run dev
