# VectorOS - Technical Documentation

**Architecture, APIs, and Deployment Guide**

Last Updated: November 6, 2025

---

## 📐 System Architecture

### **Three-Tier Architecture**

```
┌──────────────────────────────────────┐
│          FRONTEND LAYER              │
│      Next.js 15 + TypeScript         │
│      Port 3000 (Development)         │
│  - React 19 with App Router          │
│  - Clerk Authentication              │
│  - Recharts Visualizations           │
│  - Tailwind CSS + Framer Motion      │
└──────────┬───────────────────────────┘
           │ REST API (fetch)
           ▼
┌──────────────────────────────────────┐
│          BACKEND LAYER               │
│     Node.js + Express + Prisma       │
│      Port 3001 (Development)         │
│  - PostgreSQL Database               │
│  - Business Logic Layer              │
│  - Clerk Webhook Handler             │
│  - Multi-tenant Workspaces           │
└──────────┬───────────────────────────┘
           │ REST API (axios)
           ▼
┌──────────────────────────────────────┐
│           AI CORE LAYER              │
│      Python + FastAPI + NumPy        │
│      Port 8000 (Development)         │
│  - Monte Carlo Simulations           │
│  - Deal Scoring Engine               │
│  - Vector Embeddings (Qdrant)        │
│  - Semantic Search (384-dim vectors) │
│  - ML Model Inference (Future)       │
└──────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### **Core Tables**

**users**
```sql
id              UUID PRIMARY KEY
clerkId         VARCHAR UNIQUE NOT NULL
email           VARCHAR NOT NULL
firstName       VARCHAR
lastName        VARCHAR
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

**workspaces**
```sql
id              UUID PRIMARY KEY
name            VARCHAR NOT NULL
ownerId         UUID REFERENCES users(id)
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

**workspace_members**
```sql
id              UUID PRIMARY KEY
workspaceId     UUID REFERENCES workspaces(id)
userId          UUID REFERENCES users(id)
role            ENUM('owner', 'admin', 'member')
joinedAt        TIMESTAMP
```

**deals**
```sql
id              UUID PRIMARY KEY
workspaceId     UUID REFERENCES workspaces(id)
title           VARCHAR NOT NULL
company         VARCHAR
value           DECIMAL
stage           VARCHAR (prospect/qualified/proposal/negotiation/closed)
probability     INTEGER (0-100)
contactName     VARCHAR
contactEmail    VARCHAR
closeDate       DATE
outcome         VARCHAR (null=active, 'won', 'lost') -- ML training
lostReason      VARCHAR -- why deal was lost
closedAt        TIMESTAMP -- when outcome determined
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

**activities**
```sql
id              UUID PRIMARY KEY
dealId          UUID REFERENCES deals(id)
type            VARCHAR (email/call/meeting/note)
description     TEXT
date            TIMESTAMP
createdAt       TIMESTAMP
```

**insights**
```sql
id              UUID PRIMARY KEY
workspaceId     UUID REFERENCES workspaces(id)
dealId          UUID REFERENCES deals(id) NULLABLE
type            VARCHAR (risk/opportunity/warning/recommendation)
priority        VARCHAR (critical/high/medium/low)
title           VARCHAR NOT NULL
description     TEXT
confidence      DECIMAL (0-1)
data            JSONB
actions         JSONB
createdAt       TIMESTAMP
isRead          BOOLEAN DEFAULT FALSE
```

---

## 🔌 API Documentation

### **Backend API (Port 3001)**

#### **Authentication & Users**

```
POST /api/v1/users
Create a new user account

Request:
{
  "clerkId": "user_xxx",
  "email": "user@company.com",
  "firstName": "John",
  "lastName": "Doe"
}

Response: 201
{
  "id": "uuid",
  "clerkId": "user_xxx",
  "email": "user@company.com",
  "createdAt": "2025-11-06T..."
}
```

```
GET /api/v1/users/:userId
Get user by ID

Response: 200
{
  "id": "uuid",
  "email": "user@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "workspaces": [...]
}
```

#### **Workspaces**

```
POST /api/v1/workspaces
Create workspace

Request:
{
  "name": "Acme Corp Sales",
  "ownerId": "user-uuid"
}

Response: 201
{
  "id": "workspace-uuid",
  "name": "Acme Corp Sales",
  "ownerId": "user-uuid",
  "createdAt": "2025-11-06T..."
}
```

```
GET /api/v1/workspaces/:id
Get workspace details

Response: 200
{
  "id": "workspace-uuid",
  "name": "Acme Corp Sales",
  "owner": {...},
  "members": [...],
  "deals": [...]
}
```

#### **Deals**

```
GET /api/v1/workspaces/:workspaceId/deals
List all deals in workspace

Query Parameters:
- stage (optional): filter by stage
- limit (optional): default 100
- offset (optional): pagination

Response: 200
{
  "deals": [
    {
      "id": "deal-uuid",
      "title": "Enterprise Plan - Acme Corp",
      "value": 100000,
      "stage": "proposal",
      "probability": 98,
      "closeDate": "2025-11-20",
      ...
    }
  ],
  "total": 42
}
```

```
POST /api/v1/deals
Create deal

Request:
{
  "workspaceId": "workspace-uuid",
  "title": "Enterprise Deal",
  "company": "Acme Corp",
  "value": 100000,
  "stage": "proposal",
  "probability": 70,
  "contactName": "John Smith",
  "contactEmail": "john@acme.com",
  "closeDate": "2025-12-31"
}

Response: 201
{
  "id": "deal-uuid",
  "title": "Enterprise Deal",
  "value": 100000,
  ...
}
```

```
PUT /api/v1/deals/:id
Update deal

Request: (partial update)
{
  "stage": "negotiation",
  "probability": 85
}

Response: 200
{
  "id": "deal-uuid",
  "stage": "negotiation",
  "probability": 85,
  "updatedAt": "2025-11-06T..."
}
```

```
DELETE /api/v1/deals/:id
Delete deal

Response: 204
```

#### **Health Check**

```
GET /health
Check backend service health

Response: 200
{
  "status": "healthy",
  "timestamp": "2025-11-06T...",
  "database": "connected"
}
```

---

### **AI Core API (Port 8000)**

#### **Revenue Forecasting**

```
GET /api/v1/forecast
Generate Monte Carlo revenue forecast

Query Parameters:
- workspace_id (required): UUID
- timeframe (optional): 30d, 60d, 90d (default: 30d)
- scenario (optional): worst, likely, best (default: likely)

Response: 200
{
  "workspace_id": "workspace-uuid",
  "timeframe": "30d",
  "scenario": "likely",
  "predicted_revenue": 100000,
  "confidence": 0.776,
  "best_case": 100000,
  "likely_case": 100000,
  "worst_case": 100000,
  "mean_forecast": 95220,
  "standard_deviation": 21334,
  "deals_analyzed": 1,
  "breakdown_by_stage": [
    {
      "stage": "proposal",
      "deals": 1,
      "total_value": 100000,
      "weighted_value": 98000,
      "avg_probability": 98.0
    }
  ],
  "simulation_stats": {
    "num_simulations": 10000,
    "min": 0,
    "max": 100000,
    "p5": 100000,
    "p10": 100000,
    "p25": 100000,
    "p50": 100000,
    "p75": 100000,
    "p90": 100000,
    "p95": 100000
  },
  "forecasted_deals": [
    {
      "title": "Enterprise Deal",
      "company": "Acme Corp",
      "value": 100000,
      "stage": "proposal",
      "adjusted_probability": 0.98,
      "weighted_value": 98000,
      "confidence_score": 0.95
    }
  ]
}
```

#### **Deal Scoring**

```
POST /api/v1/deals/score-workspace
Score all deals in workspace

Request:
{
  "workspace_id": "workspace-uuid"
}

Response: 200
{
  "success": true,
  "data": {
    "scored_deals": [],
    "metrics": {
      "average_health": 0,
      "total_deals": 0,
      "scored_deals": 0,
      "health_distribution": {
        "excellent": 0,
        "good": 0,
        "fair": 0,
        "poor": 0,
        "critical": 0
      }
    }
  }
}
```

#### **Vector Embeddings & Semantic Search**

```
POST /api/v1/embeddings/embed-deal
Embed a single deal in vector database

Request:
{
  "deal": {
    "id": "deal-uuid",
    "title": "Enterprise Deal - Acme Corp",
    "company": "Acme Corp",
    "value": 100000,
    "stage": "proposal",
    "probability": 98
  }
}

Response: 200
{
  "success": true,
  "point_id": "deal-uuid",
  "message": "Deal 'Enterprise Deal - Acme Corp' embedded successfully"
}
```

```
POST /api/v1/embeddings/embed-multiple
Batch embed multiple deals

Request:
{
  "deals": [
    {"id": "1", "title": "Deal 1", ...},
    {"id": "2", "title": "Deal 2", ...}
  ]
}

Response: 200
{
  "success": true,
  "embedded_count": 2,
  "point_ids": ["uuid1", "uuid2"],
  "message": "Successfully embedded 2/2 deals"
}
```

```
POST /api/v1/embeddings/find-similar
Find similar deals using vector search

Request (by deal ID):
{
  "deal_id": "deal-uuid",
  "limit": 10,
  "score_threshold": 0.7
}

OR Request (by text):
{
  "deal_text": "Enterprise software deal for financial services",
  "limit": 5,
  "score_threshold": 0.8
}

Response: 200
{
  "success": true,
  "count": 3,
  "similar_deals": [
    {
      "deal_id": "similar-uuid",
      "title": "Similar Deal",
      "company": "Similar Co",
      "value": 90000,
      "stage": "proposal",
      "probability": 95,
      "outcome": "won",
      "similarity_score": 0.87,
      "close_date": "2025-10-15"
    }
  ]
}
```

```
GET /api/v1/embeddings/stats
Get vector database statistics

Response: 200
{
  "success": true,
  "stats": {
    "total_deals": 2,
    "vector_size": 384,
    "distance_metric": "COSINE"
  }
}
```

#### **Health Check**

```
GET /health
Check AI Core service health

Response: 200
{
  "status": "healthy",
  "service": "vectoros-ai-core",
  "version": "0.1.0"
}
```

---

### **Backend API - Auto-Embedding**

#### **Batch Embed Workspace Deals**

```
POST /api/v1/workspaces/:workspaceId/deals/embed-all
Batch embed all deals in a workspace

Response: 200
{
  "success": true,
  "message": "Successfully embedded 15/15 deals",
  "embedded_count": 15,
  "total_deals": 15
}
```

**Note**: Deal creation and updates automatically trigger embedding in the background (non-blocking).

---

## 🚀 Deployment

### **Railway Deployment (Current Production)**

**Services Deployed:**
1. Frontend: `vectoros-frontend-production.up.railway.app`
2. Backend: `vectoros-backend-production.up.railway.app`
3. AI Core: `vectoros-ai-core-production.up.railway.app`

**Environment Variables:**

**Frontend:**
```
NEXT_PUBLIC_API_URL=https://vectoros-backend-production.up.railway.app
NEXT_PUBLIC_AI_URL=https://vectoros-ai-core-production.up.railway.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
```

**Backend:**
```
DATABASE_URL=postgresql://user:pass@host:5432/db
CLERK_SECRET_KEY=sk_test_xxx
PORT=3001
NODE_ENV=production
```

**AI Core:**
```
BACKEND_URL=https://vectoros-backend-production.up.railway.app
CORS_ORIGINS=https://vectoros-frontend-production.up.railway.app
PORT=8000
```

### **Local Development Setup**

**Prerequisites:**
- Node.js 18+
- Python 3.11+
- PostgreSQL
- Clerk account

**Installation:**

```bash
# Clone repository
git clone https://github.com/yourusername/VectorOS.git
cd VectorOS

# Install root dependencies
npm install

# Backend setup
cd backend
npm install
cd ..

# Frontend setup
cd frontend
npm install
cd ..

# AI Core setup
cd ai-core
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Environment setup
cp .env.example .env
# Edit .env with your credentials
```

**Running Services:**

```bash
# Terminal 1 - Backend
npm run dev:backend
# Output: Backend running on http://localhost:3001

# Terminal 2 - AI Core
npm run dev:ai
# Output: AI Core running on http://localhost:8000

# Terminal 3 - Frontend
npm run dev:frontend
# Output: Frontend running on http://localhost:3000
```

**Verify Installation:**
- Frontend: http://localhost:3000
- Backend Health: http://localhost:3001/health
- AI Core Health: http://localhost:8000/health

---

## 🔧 Development Workflows

### **Adding a New Feature**

1. **Backend Changes**:
   ```bash
   cd backend
   # Edit src/index.ts or src/services/*
   # Auto-reload with nodemon
   ```

2. **AI Core Changes**:
   ```bash
   cd ai-core
   source venv/bin/activate
   # Edit src/main_simple.py or src/services/*
   # Manual restart required
   lsof -ti:8000 | xargs kill -9
   uvicorn src.main_simple:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Frontend Changes**:
   ```bash
   cd frontend
   # Edit app/* or components/*
   # Auto-reload with Next.js
   ```

4. **Database Schema Changes**:
   ```bash
   cd backend
   # Edit prisma/schema.prisma
   npx prisma generate
   npx prisma db push
   ```

### **Debugging**

**Backend Logs:**
```bash
# Terminal output shows Express server logs
# Check for errors in API responses
```

**AI Core Logs:**
```bash
# Terminal output shows FastAPI logs
# Check for Python errors and stack traces
```

**Frontend Logs:**
```bash
# Browser console (F12)
# Next.js terminal shows build errors
```

**Database Inspection:**
```bash
cd backend
npx prisma studio
# Opens visual database browser at http://localhost:5555
```

---

## 📊 Key Implementation Files

### **Monte Carlo Forecaster**
**File**: `ai-core/src/services/revenue_forecaster.py`
**Lines**: 1-419
**Key Functions**:
- `_run_monte_carlo()`: 10,000 simulations with Beta distribution
- `_calculate_percentiles()`: Statistical analysis
- `forecast_revenue()`: Main API endpoint

### **Enterprise Dashboard**
**File**: `frontend/app/forecast/page.tsx`
**Lines**: 1-850+
**Key Components**:
- Scenario cards (Worst, Likely, Best Case)
- Bar chart with gradient fills
- Area chart for probability distribution
- Composed chart for trend forecasting
- Donut chart for pipeline by stage
- Horizontal bar for pipeline health
- Funnel visualization with velocity metrics

### **Simplified AI Core**
**File**: `ai-core/src/main_simple.py`
**Lines**: 1-72
**Endpoints**:
- `/api/v1/forecast`: Monte Carlo forecasting
- `/api/v1/deals/score-workspace`: Deal scoring placeholder
- `/health`: Health check

---

## 🔐 Security & Authentication

### **Clerk Integration**

**Frontend** (`frontend/app/layout.tsx`):
```tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  )
}
```

**Middleware** (`frontend/middleware.ts`):
```ts
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()
export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

**Backend Webhook**:
```ts
// backend/src/index.ts
app.post('/api/clerk/webhook', async (req, res) => {
  const { type, data } = req.body

  if (type === 'user.created') {
    // Create user in database
  }

  res.status(200).send('OK')
})
```

---

## 🐛 Troubleshooting

### **Common Issues**

**1. Port Already in Use**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:8000 | xargs kill -9  # AI Core
```

**2. Database Connection Error**
```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL is running
# Test connection:
psql $DATABASE_URL
```

**3. Clerk Authentication Error**
```bash
# Missing environment variables
# Check NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# Check CLERK_SECRET_KEY
# Clear browser cookies for localhost:3000
```

**4. AI Core Import Error**
```bash
cd ai-core
source venv/bin/activate
pip install -r requirements.txt
```

**5. Frontend Build Error**
```bash
cd frontend
rm -rf .next
npm run build
```

---

## 📈 Performance Optimization

### **Database Queries**
- Use Prisma's `include` for eager loading
- Add indexes on frequently queried fields
- Implement pagination for large datasets

### **API Response Times**
- Backend endpoints: Target <200ms
- AI Core endpoints: Target <2s (includes Monte Carlo simulation)

### **Frontend Loading**
- Use Next.js Image component for optimized images
- Implement React.lazy() for code splitting
- Add loading skeletons for better UX

---

## 🧪 Testing Strategy

### **Manual Testing Checklist**
- [ ] Sign up / Sign in flow
- [ ] Create workspace
- [ ] Create deal
- [ ] Generate forecast
- [ ] View all charts
- [ ] Update deal
- [ ] Verify real-time recalculation

### **API Testing**
```bash
# Health checks
curl http://localhost:3001/health
curl http://localhost:8000/health

# Create deal
curl -X POST http://localhost:3001/api/v1/deals \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Deal","value":50000,"workspaceId":"uuid"}'

# Generate forecast
curl "http://localhost:8000/api/v1/forecast?workspace_id=uuid&timeframe=30d"
```

---

## 📚 Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Recharts Docs**: https://recharts.org/en-US
- **Clerk Docs**: https://clerk.com/docs

---

## 🔄 Next Steps

See `VISION_AND_ROADMAP.md` for:
- AI model training timeline
- Vector search integration
- Autonomous monitoring implementation
- Feature roadmap

---

**For questions or issues, contact the VectorOS team.**

**Last Updated**: November 6, 2025
