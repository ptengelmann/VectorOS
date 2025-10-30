# VectorOS Architecture

## System Overview

VectorOS is built as a microservices architecture with three main components:

```
┌──────────────────────────────────────────┐
│         VectorOS Frontend                │
│  Next.js Dashboard | Chat Interface      │
└───────────────┬──────────────────────────┘
                │
┌───────────────┴──────────────────────────┐
│        Node.js Backend API               │
│  Auth | API Routes | DB | Integrations   │
└───────────────┬──────────────────────────┘
                │
┌───────────────┴──────────────────────────┐
│         AI Core Engine (Python)          │
│  FastAPI | Claude | LangChain            │
└───────────────┬──────────────────────────┘
                │
┌───────────────┴──────────────────────────┐
│      Supabase PostgreSQL Database        │
└──────────────────────────────────────────┘
```

## Components

### 1. Frontend (Next.js)

**Technology Stack:**
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- Recharts (data visualization)

**Key Features:**
- Server-side rendering for performance
- Real-time dashboard updates
- Interactive AI chat interface
- Responsive design

**Directory Structure:**
```
frontend/
├── app/                    # Next.js app router
│   ├── (auth)/            # Auth routes
│   ├── dashboard/         # Main dashboard
│   ├── insights/          # AI insights view
│   └── settings/          # Settings
├── components/            # React components
│   ├── ui/               # UI primitives
│   ├── dashboard/        # Dashboard components
│   └── ai/               # AI-related components
└── lib/                  # Utilities & API clients
```

### 2. Backend (Node.js)

**Technology Stack:**
- Node.js with TypeScript
- Express.js
- Prisma ORM
- PostgreSQL (Supabase)

**Responsibilities:**
- Authentication & authorization
- CRUD operations
- Integration management (HubSpot, Notion, etc.)
- Real-time data sync
- API gateway to AI core

**Directory Structure:**
```
backend/
├── src/
│   ├── routes/           # API routes
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── middleware/       # Auth, validation, etc.
│   ├── models/           # Data models
│   └── utils/            # Helper functions
└── prisma/
    └── schema.prisma     # Database schema
```

### 3. AI Core (Python)

**Technology Stack:**
- FastAPI
- Anthropic Claude API
- LangChain
- Pydantic

**Responsibilities:**
- AI-powered insights generation
- Natural language processing
- Business data analysis
- Recommendation engine
- Predictive analytics

**Directory Structure:**
```
ai-core/
└── src/
    ├── agents/           # AI agents
    ├── tools/            # LangChain tools
    ├── services/         # AI services
    ├── models/           # Pydantic models
    └── utils/            # Helpers
```

## Data Flow

### 1. User Request Flow

```
User → Frontend → Backend API → Database
                            ↓
                      AI Core (if needed)
```

### 2. Insight Generation Flow

```
Scheduled Job → Backend → Fetch Data → AI Core
                                         ↓
                                    Analyze with Claude
                                         ↓
                            Store Insights in Database
                                         ↓
                                  Push to Frontend
```

### 3. Integration Sync Flow

```
External System (HubSpot) → Webhook → Backend
                                        ↓
                                  Transform Data
                                        ↓
                                  Store in Database
                                        ↓
                                AI Analysis (async)
```

## Database Schema

See `/backend/prisma/schema.prisma` for the complete schema.

**Core Models:**
- `User` - User accounts
- `Workspace` - Multi-tenant workspaces
- `Integration` - Connected external services
- `Deal` - Sales opportunities
- `Activity` - User/system activities
- `Insight` - AI-generated insights

## Security

### Authentication
- Clerk for user authentication (planned)
- JWT tokens for API authentication
- Secure session management

### Data Protection
- Encrypted credentials in database
- HTTPS only in production
- Rate limiting on API endpoints
- Input validation with Zod

### API Security
- CORS configuration
- Helmet.js for HTTP headers
- SQL injection protection via Prisma

## Scalability Considerations

### Phase 1 (Current)
- Monolithic deployment
- Single database instance
- Suitable for 0-1000 users

### Phase 2 (Future)
- Containerized services (Docker)
- Horizontal scaling
- Redis caching layer
- Background job queue (Bull/BullMQ)

### Phase 3 (Future)
- Kubernetes orchestration
- Multiple database replicas
- CDN for static assets
- Microservices architecture

## Monitoring & Logging

**Planned Tools:**
- Sentry for error tracking
- PostHog for product analytics
- Custom logging with Winston
- Performance monitoring with Vercel Analytics

## Environment Configuration

All services share a common `.env` file at the root level.

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection
- `ANTHROPIC_API_KEY` - Claude API key
- `CLERK_SECRET_KEY` - Authentication
- Integration API keys

See `.env.example` for complete list.
