# VectorOS Development Guide

## Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js >= 18.0.0
- npm >= 9.0.0
- Python >= 3.10
- Git

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/ptengelmann/VectorOS.git
cd VectorOS
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

3. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..

# Install AI core dependencies
cd ai-core && pip install -r requirements.txt && cd ..
```

4. **Set up the database**
```bash
cd backend
npx prisma generate
npx prisma db push
cd ..
```

## Development Workflow

### Running All Services

From the root directory:
```bash
npm run dev
```

This starts:
- Frontend on `http://localhost:3000`
- Backend on `http://localhost:3001`
- AI Core on `http://localhost:8000`

### Running Individual Services

**Frontend only:**
```bash
cd frontend
npm run dev
```

**Backend only:**
```bash
cd backend
npm run dev
```

**AI Core only:**
```bash
cd ai-core
python src/main.py
```

## Database Management

### Using Prisma

**Generate Prisma Client:**
```bash
cd backend
npx prisma generate
```

**Push schema changes to database:**
```bash
npx prisma db push
```

**Open Prisma Studio (database GUI):**
```bash
npx prisma studio
```

**Create a migration:**
```bash
npx prisma migrate dev --name your_migration_name
```

### Database Reset

**Warning: This will delete all data!**
```bash
cd backend
npx prisma migrate reset
```

## Code Style & Linting

### Frontend & Backend (TypeScript)

**Run linter:**
```bash
cd frontend  # or backend
npm run lint
```

**Auto-fix issues:**
```bash
npm run lint -- --fix
```

### AI Core (Python)

**Format with Black:**
```bash
cd ai-core
black src/
```

**Sort imports:**
```bash
isort src/
```

## Testing

### Frontend Tests
```bash
cd frontend
npm run test
```

### Backend Tests
```bash
cd backend
npm run test
```

### AI Core Tests
```bash
cd ai-core
pytest
```

## Building for Production

### Frontend
```bash
cd frontend
npm run build
npm run start  # Run production server
```

### Backend
```bash
cd backend
npm run build
npm run start  # Run compiled JS
```

### AI Core
```bash
cd ai-core
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## Git Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Commit Convention

Use conventional commits:
```
feat: add new insight generation endpoint
fix: resolve database connection timeout
docs: update API documentation
refactor: optimize deal query performance
test: add tests for user authentication
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make your changes
3. Write/update tests
4. Update documentation
5. Submit PR to `develop`
6. Get code review
7. Merge after approval

## Common Tasks

### Adding a New API Endpoint

1. Create route in `backend/src/routes/`
2. Create controller in `backend/src/controllers/`
3. Add business logic to `backend/src/services/`
4. Update types if needed
5. Add tests

### Adding a New Database Model

1. Update `backend/prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push` or create migration
4. Update TypeScript types
5. Create service methods

### Adding a New AI Agent

1. Create agent in `ai-core/src/agents/`
2. Add tools if needed in `ai-core/src/tools/`
3. Expose via API endpoint in `ai-core/src/main.py`
4. Update backend to consume new endpoint
5. Add UI components if needed

### Adding a New Integration

1. Add integration config to environment variables
2. Create service in `backend/src/services/integrations/`
3. Add OAuth flow if needed
4. Create webhook handlers
5. Add UI for connection management
6. Test data sync

## Debugging

### Frontend Debugging

Use React Developer Tools and Next.js debugging:
```bash
NODE_OPTIONS='--inspect' npm run dev
```

### Backend Debugging

Use Node.js inspector:
```bash
npm run dev  # tsx watch includes debugging support
```

Connect debugger to `localhost:9229`

### AI Core Debugging

Use Python debugger:
```python
import pdb; pdb.set_trace()
```

Or use VS Code Python debugger.

## Environment Variables

### Frontend
Add to `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
```

### Backend
Uses root `.env` file.

### AI Core
Uses root `.env` file.

## Troubleshooting

### Port Already in Use

Kill the process using the port:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues

1. Check DATABASE_URL in `.env`
2. Ensure PostgreSQL is running
3. Verify network connectivity
4. Check Supabase dashboard

### Python Dependencies Issues

```bash
cd ai-core
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Node Modules Issues

```bash
rm -rf node_modules package-lock.json
npm install
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [LangChain Documentation](https://python.langchain.com/)
