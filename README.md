# 🧠 VectorOS

**The Self-Growing Business Operating System**

VectorOS is an AI-powered Business Operating System that learns how a company runs, then automates its growth, operations, and decision-making — starting from a single niche and expanding into a complete self-optimizing ecosystem.

## 🎯 Current Phase: MVP - Agency Growth Copilot

Building a working SaaS that helps creative/digital agencies automate sales and growth operations.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Python >= 3.10
- MongoDB (local or cloud)
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd VectorOS

# Install all dependencies
npm run install:all

# Set up environment variables
cp .env.example .env
# Edit .env with your actual credentials

# Start all services
npm run dev
```

### Project Structure

```
VectorOS/
├── frontend/          # Next.js + Tailwind UI
├── backend/           # Node.js API + Database
├── ai-core/           # Python AI Engine
├── docs/              # Documentation
└── config/            # Shared configuration
```

## 🧩 Architecture

- **Frontend**: Next.js, Tailwind CSS, Framer Motion
- **Backend**: Node.js (Express/Fastify), MongoDB
- **AI Core**: Python, LangChain, OpenAI/Anthropic
- **Auth**: Clerk / Supabase
- **Integrations**: HubSpot, Notion, Gmail, Slack

## 📚 Documentation

See the `/docs` folder for detailed documentation:
- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Development Guide](docs/DEVELOPMENT.md)

## 🗺️ Roadmap

- [x] Phase 0: Project setup & architecture
- [ ] Phase 1: MVP - Agency Growth Copilot (Months 1-4)
- [ ] Phase 2: The Growth Engine (Months 5-8)
- [ ] Phase 3: Operations OS (Months 9-12)
- [ ] Phase 4: VectorOS Core (Year 2)

## 💸 Monetization

| Tier | Description | Price |
|------|-------------|-------|
| Starter | 1 workspace, 3 integrations, insight dashboard | $49/mo |
| Pro | Unlimited integrations + automation layer | $149/mo |
| Scale | Multi-workspace + team collaboration | $299/mo |
| Enterprise | Custom integrations + white-label | $999+/mo |

## 📝 License

Proprietary - All rights reserved
