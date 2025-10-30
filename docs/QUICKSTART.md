# VectorOS Quick Start Guide

Get VectorOS up and running in 10 minutes.

## 1. Prerequisites Check

Make sure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ Python 3.10+ installed (`python3 --version`)
- ✅ Git installed (`git --version`)
- ✅ Supabase account (or PostgreSQL running locally)

## 2. Clone & Setup

```bash
# Navigate to your projects folder
cd ~/Desktop

# The repo should already exist
cd VectorOS

# Verify the structure
ls -la
```

You should see:
```
├── frontend/
├── backend/
├── ai-core/
├── docs/
├── .env
└── package.json
```

## 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..

# Install AI core dependencies (Python)
cd ai-core
python3 -m pip install -r requirements.txt
cd ..
```

## 4. Configure Environment

Your `.env` file should already have:
```
DATABASE_URL=postgresql://postgres:***@db.tjzthahyhnzaeutrpsne.supabase.co:5432/postgres
ANTHROPIC_API_KEY=sk-ant-***
```

Verify with:
```bash
cat .env | grep -E "DATABASE_URL|ANTHROPIC_API_KEY"
```

## 5. Initialize Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio

cd ..
```

## 6. Start Development Servers

### Option A: Start All Services Together

```bash
npm run dev
```

This starts:
- 🎨 Frontend: http://localhost:3000
- 🔧 Backend: http://localhost:3001
- 🧠 AI Core: http://localhost:8000

### Option B: Start Services Individually

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - AI Core:**
```bash
cd ai-core
python src/main.py
```

## 7. Verify Everything Works

### Test Backend API
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "vectoros-backend"
}
```

### Test AI Core
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "vectoros-ai-core",
  "model": "claude-3-5-sonnet-20241022"
}
```

### Test AI Chat
```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello VectorOS!", "context": {}}'
```

### Open Frontend
Open http://localhost:3000 in your browser.

## 8. Next Steps

Now that VectorOS is running, you can:

1. **Explore the Dashboard**
   - Navigate to http://localhost:3000

2. **Check Prisma Studio**
   - Open http://localhost:5555 (if running `npx prisma studio`)
   - View and edit database records

3. **Review API Documentation**
   - Read `docs/API.md`
   - Test endpoints with curl or Postman

4. **Start Building Features**
   - Follow `docs/DEVELOPMENT.md`
   - Review `docs/ARCHITECTURE.md`

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# For port 3001
lsof -ti:3001 | xargs kill -9

# For port 8000
lsof -ti:8000 | xargs kill -9
```

### Database Connection Failed

1. Check your `DATABASE_URL` in `.env`
2. Verify Supabase project is active
3. Check network connectivity
4. Try running `npx prisma db push` again

### Python Dependencies Issues

```bash
cd ai-core

# Upgrade pip
python3 -m pip install --upgrade pip

# Reinstall dependencies
python3 -m pip install -r requirements.txt --force-reinstall
```

### Node Modules Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Workflow

### Making Changes

1. **Frontend changes** - Auto-reload at http://localhost:3000
2. **Backend changes** - Auto-restart with `tsx watch`
3. **AI Core changes** - Manual restart required
4. **Database schema changes** - Run `npx prisma db push`

### Committing Changes

```bash
git add .
git commit -m "feat: your feature description"
git push origin main
```

## Resources

- 📚 [Full Documentation](../docs/)
- 🏗️ [Architecture Guide](ARCHITECTURE.md)
- 💻 [Development Guide](DEVELOPMENT.md)
- 🔌 [API Reference](API.md)
- 🐛 [GitHub Issues](https://github.com/ptengelmann/VectorOS/issues)

## Support

If you run into issues:
1. Check the documentation
2. Review error messages carefully
3. Search existing GitHub issues
4. Create a new issue with details

---

**You're all set!** Start building the future of business automation. 🚀
