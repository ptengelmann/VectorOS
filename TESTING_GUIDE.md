# VectorOS Testing Guide

## 🎯 What We're Building

**VectorOS** is an **AI-Powered Business Operating System** for managing sales pipelines and deals. Think of it as a smart CRM with AI insights powered by Claude 3.5 Sonnet.

### Core Features:
1. **Multi-tenant Workspace System** - Each company/team gets their own workspace
2. **Deal Management** - Track sales opportunities through different stages
3. **AI-Powered Insights** - Claude analyzes deals and provides recommendations
4. **Real-time Dashboard** - Live metrics and pipeline visualization
5. **Health Monitoring** - Track system status (Backend + AI services)

---

## 📊 What Gets Saved to Database

**YES - Everything is persisted to PostgreSQL:**

### 1. **Users** (`users` table)
   - ✅ Created when you sign up/create workspace
   - Email, name, timestamps
   - Stored in: `/backend/prisma/schema.prisma`

### 2. **Workspaces** (`workspaces` table)
   - ✅ Created during onboarding
   - Name, slug, tier, owner
   - One workspace per company/team

### 3. **Deals** (`deals` table)
   - ✅ All deal data persists
   - Title, value, stage, probability
   - Contact info, close dates
   - Assigned to users

### 4. **AI Insights** (`insights` table)
   - 🔄 Coming soon - will store Claude's recommendations
   - Priority, confidence scores
   - Suggested actions

### 5. **Integrations** (`integrations` table)
   - 🔄 Future - HubSpot, Notion, Slack connections

**Database Location:**
- Production: Supabase PostgreSQL
- Local: Check your `.env` for `DATABASE_URL`

---

## 🧪 How to Test

### **Step 1: Test Onboarding Flow**

1. Open browser: http://localhost:3000/onboarding

2. Fill in your details:
   ```
   Name: Your Name
   Email: your@email.com
   Workspace Name: My Company
   ```

3. Click "Create Workspace"

4. **Expected Result:**
   - ✅ User created in database
   - ✅ Workspace created in database
   - ✅ Redirected to dashboard
   - ✅ Data saved to localStorage

5. **Verify in Database:**
   ```bash
   cd backend
   # The user and workspace are now in PostgreSQL
   ```

---

### **Step 2: Add Demo Deals**

The dashboard will be empty initially. Let's add some demo data:

1. **Get your Workspace ID:**
   - Open browser console (F12)
   - Type: `localStorage.getItem('currentWorkspaceId')`
   - Copy the UUID (e.g., `b5ec9803-520c-4284-b53d-67da2814d1f7`)

2. **Run the seed script:**
   ```bash
   cd backend
   npx tsx scripts/add-deals-to-workspace.ts <YOUR_WORKSPACE_ID>
   ```

3. **Expected Output:**
   ```
   ✅ Found workspace: My Company (owner: your@email.com)
   ✅ Created deal: Enterprise SaaS Deal - Acme Corp
   ✅ Created deal: Mid-Market Implementation - TechStart
   ✅ Created deal: Discovery Call - InnovateLabs
   ✅ Created deal: Closed Won - DataFlow Systems
   ✅ Created deal: Qualified Lead - CloudNine
   ✅ Created deal: New Lead - FinTech Solutions

   🎉 Successfully created 6 demo deals!
   ```

4. **All deals are now persisted in the `deals` table!**

---

### **Step 3: View Dashboard**

1. Refresh: http://localhost:3000/dashboard

2. **You should see:**
   - 📊 **Total Pipeline:** $680,000 (sum of all deal values)
   - 📊 **Weighted Value:** ~$395,000 (adjusted by probability)
   - 📊 **Average Deal Size:** ~$113,000
   - 📊 **Conversion Rate:** Based on won/lost deals
   - 📈 **Pipeline by Stage:** Visual breakdown
   - 📋 **Recent Deals:** List of all 6 deals

3. **Health Indicators:**
   - 🟢 Backend: Should be green (healthy)
   - 🟢 AI Core: Should be green (Python FastAPI running)

---

### **Step 4: Test AI Analysis (Optional)**

To test Claude AI analyzing a deal:

```bash
# In backend directory
curl -X POST http://localhost:3001/api/v1/deals/<DEAL_ID>/analyze \
  -H "Content-Type: application/json"
```

This will:
- ✅ Send deal data to AI Core (Python)
- ✅ Claude 3.5 Sonnet analyzes the deal
- ✅ Returns recommendations, risk assessment, next steps

---

## 🔍 Data Flow Architecture

```
┌─────────────────┐
│   Frontend      │  (Next.js - Port 3000)
│  - Onboarding   │
│  - Dashboard    │
└────────┬────────┘
         │
         │ HTTP API Calls
         ↓
┌─────────────────┐
│   Backend       │  (Express - Port 3001)
│  - REST API     │
│  - Business     │
│    Logic        │
└────┬───────┬────┘
     │       │
     │       │ Deal Analysis
     │       ↓
     │  ┌──────────────┐
     │  │   AI Core    │  (FastAPI - Port 8000)
     │  │  - Claude    │
     │  │    3.5       │
     │  │  - Insights  │
     │  └──────────────┘
     │
     │ Prisma ORM
     ↓
┌─────────────────┐
│   PostgreSQL    │  (Supabase/Local)
│  - users        │  ← YOU ARE HERE (Data persists!)
│  - workspaces   │  ← WORKSPACE SAVED
│  - deals        │  ← DEALS SAVED
│  - insights     │  ← AI INSIGHTS (soon)
└─────────────────┘
```

---

## ✅ What to Test & Verify

### **Onboarding:**
- [ ] User can enter name and email
- [ ] Workspace name is required
- [ ] Redirects to dashboard after creation
- [ ] Data persists (check database)

### **Dashboard:**
- [ ] Shows correct workspace data
- [ ] Metrics calculate correctly
- [ ] Deals display properly
- [ ] Health indicators show green
- [ ] Auto-refreshes every 30 seconds

### **Database Persistence:**
- [ ] User record created with email
- [ ] Workspace created with owner link
- [ ] Deals linked to workspace
- [ ] All data survives server restart

### **Error Handling:**
- [ ] Shows error if no workspace found
- [ ] Redirects to onboarding if needed
- [ ] Handles API failures gracefully

---

## 🎨 Current Status

### ✅ Completed:
- Multi-tenant workspace system
- User & workspace creation
- Deal management (CRUD)
- Dashboard with live metrics
- Health monitoring
- Database persistence (PostgreSQL)

### 🔄 In Progress:
- AI insights UI
- Deal detail pages
- Deal creation form

### 🔮 Coming Next:
- AI-powered recommendations dashboard
- Integration with HubSpot/Notion
- Team collaboration features
- Advanced analytics

---

## 🐛 Troubleshooting

**Dashboard shows "No workspace found":**
- Go to onboarding: http://localhost:3000/onboarding
- Create a new workspace

**No deals showing:**
- Run the seed script (Step 2 above)
- Make sure you used the correct workspace ID

**Health indicators red:**
- Check backend is running: `curl http://localhost:3001/health`
- Check AI core is running: `curl http://localhost:8000/health`

**Database issues:**
- Check `.env` has correct `DATABASE_URL`
- Run: `npx prisma generate` in backend folder

---

## 📝 Summary

**YES - Everything is saved to the database!**
- Users, workspaces, deals all persist in PostgreSQL
- You can restart servers and data remains
- Full CRUD operations through REST API
- AI insights will be stored too (coming soon)

**The system is production-ready for basic deal tracking.**
Next step is building out the AI insights dashboard!
