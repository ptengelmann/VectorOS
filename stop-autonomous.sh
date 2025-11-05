#!/bin/bash

# VectorOS Autonomous Monitoring Shutdown Script

echo "🛑 Stopping VectorOS services..."

# Function to kill process by PID file
kill_by_pid_file() {
    if [ -f ".pids/$1.pid" ]; then
        PID=$(cat .pids/$1.pid)
        if ps -p $PID > /dev/null 2>&1; then
            echo "   Stopping $1 (PID: $PID)..."
            kill $PID 2>/dev/null || true
            sleep 1
            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID 2>/dev/null || true
            fi
        fi
        rm .pids/$1.pid
    fi
}

# Kill by PID files
kill_by_pid_file "backend"
kill_by_pid_file "ai-core"
kill_by_pid_file "frontend"
kill_by_pid_file "worker"

# Also kill by port (backup method)
echo "   Cleaning up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Kill any Python workers
pkill -f "continuous_monitor" 2>/dev/null || true

echo "✅ All services stopped"
