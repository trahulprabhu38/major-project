#!/bin/bash

echo "🚀 OBE CO/PO Attainment Analysis System - Quick Start"
echo "======================================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

echo "📊 Step 1: Starting databases (PostgreSQL & MongoDB)..."
docker-compose up -d postgres mongodb

echo "⏳ Waiting for databases to be ready..."
sleep 10

echo ""
echo "✅ Databases started!"
echo ""
echo "📦 Step 2: Setting up backend..."
cd backend

if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi

if [ ! -f ".env" ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
fi

echo ""
echo "🗄️ Step 3: Running database migrations..."
npm run migrate

echo ""
echo "🌱 Step 4: Seeding sample data..."
npm run seed

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "======================================================"
echo "🎉 System is ready!"
echo "======================================================"
echo ""
echo "📝 Demo Credentials:"
echo ""
echo "   Teacher:"
echo "   Email: rajesh.kumar@example.edu"
echo "   Password: password123"
echo ""
echo "   Student:"
echo "   Email: student1@example.edu"
echo "   Password: password123"
echo ""
echo "======================================================"
echo "🚀 To start the backend server, run:"
echo "   cd backend && npm run dev"
echo ""
echo "🎨 To start the frontend (in another terminal), run:"
echo "   cd edu-frontend && npm install && npm run dev"
echo ""
echo "📚 Backend API: http://localhost:8080"
echo "🌐 Frontend: http://localhost:5173"
echo "📖 Documentation: See SETUP_GUIDE.md"
echo "======================================================"
