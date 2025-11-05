#!/bin/bash

# VectorOS Autonomous Monitoring Startup Script
# Starts all services including the continuous monitoring worker

set -e

echo "🚀 Starting VectorOS with Autonomous Monitoring..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with required variables (see .env.example)"
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use. Killing process..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
check_port 3000
check_port 3001
check_port 8000

# Start Backend
echo ""
echo -e "${BLUE}[1/4] Starting Backend (Port 3001)...${NC}"
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
cd ..

# Wait for backend to be ready
sleep 3

# Start AI Core
echo ""
echo -e "${BLUE}[2/4] Starting AI Core API (Port 8000)...${NC}"
cd ai-core
source venv/bin/activate
python -m src.main > ../logs/ai-core.log 2>&1 &
AI_CORE_PID=$!
echo "AI Core PID: $AI_CORE_PID"
cd ..

# Wait for AI Core to be ready
sleep 3

# Start Frontend
echo ""
echo -e "${BLUE}[3/4] Starting Frontend (Port 3000)...${NC}"
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
cd ..

# Start Autonomous Worker
echo ""
echo -e "${BLUE}[4/4] Starting Autonomous Monitoring Worker...${NC}"
echo -e "${YELLOW}Worker will run in background and execute every 30 minutes${NC}"

# Create worker script that runs continuously
cd ai-core
source venv/bin/activate

# Run worker in loop (every 30 minutes)
while true; do
    echo ""
    echo "🤖 [$(date)] Running monitoring cycle..."
    python -m src.workers.continuous_monitor >> ../logs/worker.log 2>&1

    if [ $? -eq 0 ]; then
        echo "✅ Cycle completed successfully"
    else
        echo "❌ Cycle failed - check logs/worker.log"
    fi

    echo "⏰ Next cycle in 30 minutes..."
    sleep 1800 # 30 minutes
done &
WORKER_PID=$!
cd ..

# Save PIDs for shutdown
echo $BACKEND_PID > .pids/backend.pid
echo $AI_CORE_PID > .pids/ai-core.pid
echo $FRONTEND_PID > .pids/frontend.pid
echo $WORKER_PID > .pids/worker.pid

# Display status
echo ""
echo "================================================================"
echo -e "${GREEN}✅ VectorOS is running with AUTONOMOUS MONITORING!${NC}"
echo "================================================================"
echo ""
echo "📊 Services:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   AI Core:   http://localhost:8000"
echo "   Worker:    Running in background (every 30 min)"
echo ""
echo "📝 Logs:"
echo "   Frontend:  tail -f logs/frontend.log"
echo "   Backend:   tail -f logs/backend.log"
echo "   AI Core:   tail -f logs/ai-core.log"
echo "   Worker:    tail -f logs/worker.log"
echo ""
echo "🛑 To stop all services:"
echo "   ./stop-autonomous.sh"
echo ""
echo "🤖 The AI is now monitoring your pipeline 24/7!"
echo "   Check logs/worker.log to see autonomous cycles"
echo ""

# Keep script running
wait
