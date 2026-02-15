#!/bin/bash

# Visrodeck Relay - Quick Start Script
# This script sets up and starts the entire application

set -e

echo "╔══════════════════════════════════════════╗"
echo "║     VISRODECK RELAY QUICK START         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install Node.js >= 16.0.0 from https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠ MySQL client not found${NC}"
    echo "  Please install MySQL or ensure it's running"
fi

echo ""
echo "Step 1: Setting up Backend..."
echo "─────────────────────────────────────────"

cd backend

# Install backend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit backend/.env with your MySQL credentials${NC}"
fi

echo ""
echo "Step 2: Setting up Frontend..."
echo "─────────────────────────────────────────"

cd ../frontend

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

echo ""
echo "Step 3: Database Setup"
echo "─────────────────────────────────────────"
echo -e "${YELLOW}Please ensure MySQL is running and execute:${NC}"
echo "  mysql -u root -p < database/schema.sql"
echo ""
echo -e "${YELLOW}Or manually:${NC}"
echo "  1. Open MySQL: mysql -u root -p"
echo "  2. Run: CREATE DATABASE visrodeck_relay;"
echo "  3. Run: USE visrodeck_relay;"
echo "  4. Run: SOURCE ../database/schema.sql;"
echo ""

read -p "Have you set up the database? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please set up the database first${NC}"
    exit 1
fi

echo ""
echo "Step 4: Starting Services..."
echo "─────────────────────────────────────────"

# Start backend in background
cd ../backend
echo "Starting backend server..."
npm start &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
cd ../frontend
echo "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     VISRODECK RELAY IS NOW RUNNING      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Backend:${NC}  http://localhost:3001"
echo -e "${GREEN}✓ Frontend:${NC} http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Services stopped.'; exit" INT

# Keep script running
wait
