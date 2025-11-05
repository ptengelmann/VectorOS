# VectorOS - AI-Powered Revenue Intelligence Platform

**The AI that stops deals from dying** - Autonomously monitors your pipeline, learns from every outcome, and prevents revenue loss before it happens.

## ✅ Current Status: AUTONOMOUS INTELLIGENCE LIVE!

**Core Platform:** ✅ Operational
**AI Insights:** ✅ Claude Sonnet 4.5 Integration
**Autonomous Monitoring:** ✅ **NEW! Always-On Intelligence Engine**

### What's New:
- 🤖 **Continuous Monitoring Worker** - Analyzes all deals every 30 minutes automatically
- 🎯 **Intelligent Anomaly Detection** - Detects stale deals, velocity drops, risk signals
- 🚨 **Proactive Insights** - AI generates alerts without manual intervention
- 📊 **Deal-First Insights Dashboard** - Scalable for 5000+ deals

**This is true Revenue Intelligence, not just a CRM with AI.**

See: [`AUTONOMOUS_MONITORING_LIVE.md`](./AUTONOMOUS_MONITORING_LIVE.md) for details.

---

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Python >= 3.10
- Neon PostgreSQL account (or compatible PostgreSQL)
- Anthropic API key (Claude)

### Installation

```bash
# Clone the repository
git clone https://github.com/ptengelmann/VectorOS.git
cd VectorOS

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..

# Install AI Core dependencies
cd ai-core
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Set up environment variables
# Create .env in project root with:
DATABASE_URL="postgresql://..."
ANTHROPIC_API_KEY="sk-ant-..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Create symlinks for services
cd backend && ln -sf ../.env .env && cd ..
cd ai-core && ln -sf ../.env .env && cd ..

# Initialize database
cd backend
npx prisma generate
npx prisma db push
cd ..
```

### Run Development Servers

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

**Terminal 3 - AI Core:**
```bash
cd ai-core
source venv/bin/activate
python -m src.main
# Runs on http://localhost:8000
```

### Verify Installation
- Frontend: http://localhost:3000
- Backend Health: http://localhost:3001/health
- AI Core Health: http://localhost:8000/health

### Quick Start with Autonomous Monitoring
```bash
# One-command startup (all services + autonomous worker)
./start-autonomous.sh

# Stop all services
./stop-autonomous.sh
```

---

## Project Structure

```
VectorOS/
├── frontend/              # Next.js 16 + TypeScript + Tailwind CSS
│   ├── app/              # App router pages
│   ├── components/       # React components
│   └── lib/              # API client and utilities
│
├── backend/              # Node.js + Express + Prisma
│   ├── src/
│   │   ├── services/    # Business logic services
│   │   └── index.ts     # API routes
│   └── prisma/          # Database schema
│
├── ai-core/              # Python + FastAPI + Claude Sonnet 4
│   ├── src/
│   │   ├── services/    # AI services (insights, scoring, analysis)
│   │   ├── config.py    # Configuration
│   │   └── main.py      # FastAPI app
│   └── requirements.txt
│
├── docs/                 # Architecture and planning docs
└── .env                 # Environment variables (create this)
```

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Auth:** Clerk
- **State:** React Hooks + localStorage

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** Neon PostgreSQL (serverless)
- **Language:** TypeScript

### AI Core
- **Framework:** FastAPI
- **Language:** Python 3.10+
- **LLM:** Claude Sonnet 4 (Anthropic API)
- **Embeddings:** sentence-transformers (all-MiniLM-L6-v2)
- **Vector DB:** Qdrant (planned)

---

## Features

### Current (Implemented)
- ✅ **Authentication:** Clerk integration, workspace management
- ✅ **Deal Management:** Create, view, update deals with health scoring
- ✅ **Dashboard:** Real-time metrics and pipeline visualization
- ✅ **AI Insights (RAG-based):** Intelligent insights generator using Claude Sonnet 4
  - Retrieval-Augmented Generation with vector memory
  - Context-aware deal analysis
  - Structured insights with confidence scores
- ✅ **AI Deal Analysis:** Deep individual deal analysis with Claude
- ✅ **Health Scoring:** Algorithmic deal health scoring (6 dimensions)

### In Progress
- 🔄 **Insights Generation Refinement:** Optimizing Claude prompts for better results
- 🔄 **Vector Database Integration:** Full Qdrant setup for semantic search

### Planned (Next 4-12 Weeks)
- 📅 **Revenue Forecasting:** AI-powered revenue predictions with confidence intervals
- 📅 **Pipeline Health Dashboard:** Real-time bottleneck detection
- 📅 **Churn Prediction:** Prevent customer churn before it happens
- 📅 **Email/Calendar Integration:** Automatic deal capture from Gmail/Outlook
- 📅 **Autonomous Monitoring:** 24/7 background monitoring with automatic alerts
- 📅 **Advanced Analytics:** Rep performance, cycle time analysis

---

## API Endpoints

### Backend API (Port 3001)
```
Authentication & Users
POST   /api/v1/users                    Create user
GET    /api/v1/users/:userId            Get user

Workspaces
POST   /api/v1/workspaces               Create workspace
GET    /api/v1/workspaces/:id           Get workspace

Deals
GET    /api/v1/workspaces/:id/deals     List deals
POST   /api/v1/deals                    Create deal
GET    /api/v1/deals/:id                Get deal
PUT    /api/v1/deals/:id                Update deal

Insights
GET    /api/v1/workspaces/:id/insights  List insights
POST   /api/v1/workspaces/:id/insights/generate  Generate insights

Health
GET    /health                          Health check
```

### AI Core API (Port 8000)
```
Insights
POST   /api/v1/insights/generate        Generate workspace insights

Deal Analysis
POST   /api/v1/deals/analyze            Analyze individual deal
POST   /api/v1/deals/score              Score deal health

Health
GET    /health                          Health check
```

---

## Database Schema

### Core Models
- **User** - User accounts with Clerk integration
- **Workspace** - Multi-tenant workspaces
- **WorkspaceMember** - User-workspace relationships with roles
- **Deal** - Sales opportunities
  - Fields: title, company, value, stage, probability, contactName, contactEmail, closeDate
  - Timestamps: createdAt, updatedAt
  - Relations: workspace, activities, insights
- **Activity** - Deal interactions (emails, calls, meetings)
- **Insight** - AI-generated alerts and recommendations
  - Types: risk, opportunity, warning, recommendation
  - Priorities: critical, high, medium, low
  - Fields: title, description, confidence, data, actions

---

## Documentation

### 📚 Core Documentation (3 Files)
- **[COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md)** - 📖 Everything: deployment, architecture, status, roadmap, troubleshooting
- **[AUTONOMOUS_MONITORING.md](./AUTONOMOUS_MONITORING.md)** - 🤖 Deep dive on autonomous monitoring system
- **[README.md](./README.md)** - ⚡ This file: quick start and overview

### 📝 Additional Resources
- **[AI_INSIGHTS_ARCHITECTURE.md](./AI_INSIGHTS_ARCHITECTURE.md)** - 🧠 RAG architecture details
- **[ROADMAP_AND_VISION.md](./ROADMAP_AND_VISION.md)** - 🎯 Product strategy
- **[POSITIONING.md](./POSITIONING.md)** - 💡 Competitive positioning

---

## Environment Variables

Create a `.env` file in the project root:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@host/database"

# AI (Anthropic Claude)
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/onboarding"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"

# API URLs
NEXT_PUBLIC_API_URL="http://localhost:3001"
AI_CORE_URL="http://localhost:8000"
```

---

## Development Workflow

### Common Commands

```bash
# Kill processes on ports (if needed)
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:8000 | xargs kill -9  # AI Core

# Database operations
cd backend
npx prisma studio       # Visual database browser
npx prisma generate     # Regenerate Prisma client after schema changes
npx prisma db push      # Push schema changes to database

# View logs
# Frontend: Browser console
# Backend: Terminal output
# AI Core: Terminal output
```

### Making Changes

1. **Frontend Changes:**
   - Edit files in `frontend/app/` or `frontend/components/`
   - Hot reload is automatic
   - Check browser console for errors

2. **Backend Changes:**
   - Edit files in `backend/src/`
   - Server auto-restarts with nodemon
   - Check terminal for errors

3. **AI Core Changes:**
   - Edit files in `ai-core/src/`
   - Restart the service manually
   - Check terminal for errors

4. **Database Schema Changes:**
   ```bash
   cd backend
   # Edit prisma/schema.prisma
   npx prisma db push
   npx prisma generate
   ```

---

## Testing

### Manual Testing
1. Sign up / Sign in (Clerk authentication)
2. Create workspace (onboarding flow)
3. Create deals
4. View dashboard
5. Generate insights (AI Core integration)

### API Testing
Use curl or Postman:
```bash
# Health checks
curl http://localhost:3001/health
curl http://localhost:8000/health

# Create deal
curl -X POST http://localhost:3001/api/v1/deals \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Acme Corp - Enterprise",
    "value": 120000,
    "stage": "negotiation",
    "workspaceId": "..."
  }'

# Generate insights
curl -X POST http://localhost:3001/api/v1/workspaces/{workspaceId}/insights/generate
```

---

## Troubleshooting

### Backend won't start - Database connection error
- Check DATABASE_URL in .env
- Verify Neon database is active
- Ensure .env symlink exists in backend/

### AI Core authentication error
- Check ANTHROPIC_API_KEY in .env
- Verify key starts with "sk-ant-api03-"
- Ensure .env symlink exists in ai-core/

### Port already in use
```bash
# Kill the process using the port
lsof -ti:3000 | xargs kill -9
```

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check NEXT_PUBLIC_API_URL in .env
- Check browser console for CORS errors

---

## Production Deployment

VectorOS is production-ready with full deployment configurations for Railway, Render, Fly.io, and more.

### Quick Deploy to Railway (Recommended)
```bash
# Install Railway CLI
npm i -g @railway/cli
railway login

# Deploy (includes autonomous worker with cron)
railway init
railway up
```

### Deploy to Render
1. Connect GitHub repository
2. Create 4 services:
   - Frontend (Next.js)
   - Backend (Node.js)
   - AI Core (Python)
   - Worker (Cron Job - every 30 minutes)

### Deploy with Docker
```bash
# Build all services
docker-compose up -d

# Check logs
docker-compose logs -f worker
```

### Complete Deployment Guide
See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for:
- Step-by-step instructions for all platforms
- Environment variables setup
- Autonomous worker configuration
- Monitoring and alerting
- Scaling considerations
- Cost estimates

---

## Architecture

### Three-Tier Architecture
```
┌─────────────────┐
│    Frontend     │  Next.js (Port 3000)
│   (React/TS)    │  - User interface
│                 │  - Clerk authentication
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│     Backend     │  Express (Port 3001)
│  (Node/TS/DB)   │  - Business logic
│                 │  - Database operations
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│    AI Core      │  FastAPI (Port 8000)
│  (Python/ML)    │  - Claude Sonnet 4 integration
│                 │  - RAG-based insights
│                 │  - Vector embeddings
└─────────────────┘
```

---

## Product Vision

**VectorOS is an AI-powered Revenue Intelligence Platform for B2B SaaS companies.**

We prevent revenue loss by:
- Autonomously monitoring pipelines 24/7
- Predicting problems before they happen (stale deals, churn risk)
- Providing actionable recommendations with AI
- Learning from every outcome to improve accuracy over time

**Target Market:** B2B SaaS companies ($5M-$50M ARR) with 10-50 sales reps

**Competitive Edge:**
- True autonomous monitoring (not just dashboards)
- Learning system that improves with usage
- Mid-market pricing ($500-3K/month vs $50K+ enterprise tools)
- AI-first architecture with Claude Sonnet 4

---

## Contributing

This is a proprietary project. For development questions or issues, contact the team.

---

## License

Proprietary - All rights reserved

---

## Team Resources

- **GitHub:** https://github.com/ptengelmann/VectorOS
- **Documentation:** See `/docs` folder
- **Status Updates:** See CURRENT_STATUS.md
- **Architecture:** See AI_INSIGHTS_ARCHITECTURE.md and AUTONOMOUS_ARCHITECTURE.md

---

**Last Updated:** November 4, 2025
