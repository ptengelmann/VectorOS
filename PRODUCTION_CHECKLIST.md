# VectorOS Production Readiness Checklist

**Use this checklist before deploying to production.**

---

## 🚨 Critical (Must Complete Before Launch)

### 1. Error Tracking & Monitoring

- [ ] **Set up Sentry account**
  - Go to https://sentry.io
  - Create new project (select Node.js + Python)
  - Copy DSN from project settings

- [ ] **Add SENTRY_DSN to environment variables**
  ```bash
  SENTRY_DSN="https://xxxxx@o123456.ingest.sentry.io/7890123"
  ```
  - Add to Railway/Render dashboard
  - Add to `.env` for local testing

- [ ] **Test Sentry integration**
  ```bash
  # In backend, trigger a test error:
  curl -X POST http://localhost:3001/api/v1/test/sentry

  # Check Sentry dashboard for the error
  ```

- [ ] **Set up Sentry alerts**
  - Go to Sentry → Alerts → Create Alert Rule
  - Alert on: Errors > 10 in 1 hour
  - Notify: Your email + Slack (if available)

---

### 2. Uptime Monitoring

- [ ] **Set up Uptime Robot (free)**
  - Go to https://uptimerobot.com
  - Create account (free tier: 50 monitors)

- [ ] **Add monitors for all services**
  - Monitor 1: Frontend (https://your-app.railway.app)
  - Monitor 2: Backend Health (https://your-backend.railway.app/health)
  - Monitor 3: AI Core Health (https://your-ai-core.railway.app/health)

- [ ] **Configure alerts**
  - Alert contacts: Add your email
  - Check interval: Every 5 minutes
  - Alert when down for: 2 minutes

---

### 3. Environment Variables

- [ ] **Verify all services have correct env vars**

**Backend:**
```bash
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
CLERK_SECRET_KEY=sk_live_...  # ⚠️  Must be LIVE key, not test
SENTRY_DSN=https://...
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

**AI Core:**
```bash
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
SENTRY_DSN=https://...
NODE_ENV=production
```

**Worker (same as AI Core):**
```bash
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
SENTRY_DSN=https://...
NODE_ENV=production
```

**Frontend:**
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # ⚠️  Must be LIVE key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

- [ ] **Test database connection**
  ```bash
  psql $DATABASE_URL -c "SELECT 1;"
  ```

- [ ] **Verify Anthropic API credits**
  - Go to https://console.anthropic.com
  - Check remaining credits
  - Set up billing alert if >$100/month

- [ ] **Verify Clerk production keys**
  - Go to https://dashboard.clerk.com
  - Switch to Production environment
  - Copy LIVE keys (not test keys)

---

### 4. Security Configuration

- [ ] **CORS origins set correctly**
  - Backend allows only your frontend domain
  - No `Access-Control-Allow-Origin: *` in production

  ```typescript
  // backend/src/index.ts
  cors({
    origin: process.env.FRONTEND_URL || 'https://your-frontend.vercel.app'
  })
  ```

- [ ] **Rate limiting enabled**
  - Backend API has rate limits
  - Default: 100 requests per 15 minutes per IP

  ```typescript
  // Already configured in backend/src/index.ts
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
  ```

- [ ] **SSL certificates active**
  - Verify HTTPS works for all services
  - Check certificate validity: https://www.ssllabs.com/ssltest/

- [ ] **Environment secrets not in code**
  - No API keys in source code
  - All secrets in environment variables
  - .env file in .gitignore

---

### 5. Database Setup

- [ ] **Neon database active**
  - Go to https://console.neon.tech
  - Verify database is not paused
  - Check connection pooling enabled

- [ ] **Database schema deployed**
  ```bash
  cd backend
  npx prisma db push
  npx prisma generate
  ```

- [ ] **Database backups enabled**
  - Neon automatically backs up every day
  - Verify in Neon console: Settings → Backups
  - Test restore once (optional but recommended)

- [ ] **Database indexes created**
  - Prisma automatically creates indexes from schema
  - Verify in database:
  ```sql
  SELECT tablename, indexname FROM pg_indexes
  WHERE schemaname = 'public';
  ```

---

## ⚠️ Important (Should Have)

### 6. Autonomous Worker Verification

- [ ] **Worker deployed and running**
  - Railway: Check `railway logs ai-core-worker`
  - Render: Check Cron Jobs → Logs
  - Docker: Check `docker-compose logs worker`

- [ ] **Worker executes every 30 minutes**
  - Check logs for "MONITORING CYCLE COMPLETE" every 30 min
  - Verify timestamp is recent

- [ ] **Worker generates insights successfully**
  - Check database for recent insights:
  ```sql
  SELECT COUNT(*), MAX("createdAt")
  FROM "Insight"
  WHERE "createdAt" > NOW() - INTERVAL '1 hour';
  ```

- [ ] **Worker error handling works**
  - Check Sentry for worker errors
  - Verify worker doesn't crash on failure

---

### 7. Load Testing

- [ ] **Test with 50-100 deals**
  - Create 50+ test deals in database
  - Run worker manually
  - Verify completes in <60 seconds

- [ ] **Test Claude API rate limits**
  - Generate insights for 20+ deals
  - Verify no rate limit errors
  - Check API usage in Anthropic console

- [ ] **Test database query performance**
  - Run slow query log in Neon
  - Verify all queries <100ms
  - Check connection pool not exhausted

---

### 8. Logging Infrastructure

- [ ] **Set up log aggregation (optional but recommended)**
  - Option 1: Better Stack (https://betterstack.com/logs)
  - Option 2: Logtail (https://logtail.com)
  - Option 3: Papertrail (https://papertrailapp.com)

- [ ] **Configure log retention**
  - Keep logs for 30 days minimum
  - Archive critical logs for 1 year

- [ ] **Set up log alerts**
  - Alert on: ERROR level logs
  - Alert on: Worker failures
  - Alert on: Claude API errors

---

## 💡 Nice to Have

### 9. CI/CD Pipeline (Optional)

- [ ] **Set up GitHub Actions**
  - Auto-deploy on push to main
  - Run tests before deploy
  - See `.github/workflows/deploy.yml`

- [ ] **Add pre-deployment checks**
  - TypeScript compilation passes
  - Prisma schema validates
  - No linting errors

---

### 10. Analytics & Metrics

- [ ] **Set up analytics (optional)**
  - Option 1: PostHog (https://posthog.com)
  - Option 2: Mixpanel (https://mixpanel.com)
  - Track: Insight views, actions taken, user retention

- [ ] **Set up custom metrics**
  - Worker success rate
  - Insights generated per day
  - Claude API costs per day

---

### 11. Documentation

- [ ] **Update README with production URLs**
- [ ] **Document deployment process**
- [ ] **Create runbook for common issues**
- [ ] **Document environment variables**

---

## ✅ Final Verification (Do This Last)

### End-to-End Test

- [ ] **1. Sign up as new user**
  - Go to your production URL
  - Sign up with real email
  - Verify Clerk email works

- [ ] **2. Create workspace**
  - Complete onboarding
  - Verify workspace created in database

- [ ] **3. Create test deal**
  - Title: "Test Deal - High Value"
  - Value: $50,000
  - Stage: negotiation
  - Probability: 20% (intentionally low to trigger anomaly)

- [ ] **4. Wait 30 minutes**
  - Worker should run automatically
  - Check worker logs for "MONITORING CYCLE COMPLETE"

- [ ] **5. Check insights page**
  - Should see automatic insights for test deal
  - Verify insights have actions
  - Verify insights display correctly

- [ ] **6. Check Sentry**
  - Go to Sentry dashboard
  - Verify no errors in last 30 minutes
  - If errors, investigate and fix

- [ ] **7. Check Uptime Robot**
  - All monitors should be "Up"
  - No downtime alerts

---

## 🚀 Launch Checklist

Before announcing to users:

- [ ] All "Critical" items completed
- [ ] Most "Important" items completed
- [ ] End-to-end test passed
- [ ] No errors in Sentry (last 24 hours)
- [ ] All services "Up" in Uptime Robot
- [ ] Worker running successfully (check last 3 cycles)
- [ ] Backup plan ready (rollback procedure documented)
- [ ] Team notified of launch
- [ ] Support email set up
- [ ] Pricing page live
- [ ] Terms of service + privacy policy published

---

## 📞 Emergency Contacts

**If something breaks in production:**

1. Check Sentry for errors
2. Check Uptime Robot for downtime
3. Check Railway/Render logs
4. Check worker logs specifically
5. Verify database is not paused (Neon)
6. Verify Anthropic API credits not exhausted

**Rollback procedure:**
```bash
# Railway
railway rollback

# Render
# Go to Dashboard → Deployments → Rollback

# Docker
git checkout <previous-commit>
docker-compose up -d --build
```

---

## 📊 Post-Launch Monitoring

**First 24 hours:**
- [ ] Check Sentry every 2 hours
- [ ] Verify worker runs successfully (16 cycles in 24 hours)
- [ ] Monitor Claude API costs
- [ ] Check database performance
- [ ] Monitor user signups

**First week:**
- [ ] Daily Sentry review
- [ ] Weekly cost analysis (infrastructure + Claude)
- [ ] User feedback review
- [ ] Performance metrics review

---

## 🎯 Success Metrics

**Technical health:**
- Uptime: >99.5%
- Error rate: <1%
- Worker success rate: >98%
- API response time: <500ms p95

**Business metrics:**
- Users signed up
- Workspaces created
- Deals added
- Insights generated per day
- Insights viewed
- Actions taken on insights

---

**Last Updated:** November 5, 2025
**Status Template:** Copy this file and check off items as you complete them
