# VectorOS - Next Steps & Priorities

**Strategic Roadmap for Phase 2.2-2.4**

Last Updated: November 7, 2025

---

## ✅ What We Just Completed (Phase 2.1)

### **Vector Search & Semantic Analysis**
- ✅ Qdrant vector database integration (in-memory for dev)
- ✅ Sentence Transformers embeddings (all-MiniLM-L6-v2, 384-dim)
- ✅ Auto-embedding pipeline (non-blocking on create/update)
- ✅ Semantic similarity search API
- ✅ Batch embedding endpoint for existing deals
- ✅ 4 new AI Core API endpoints

**Files Created:**
- `backend/src/services/aiCoreClient.ts` - HTTP client for AI Core
- `ai-core/src/services/embeddings_service.py` - Vector embedding service
- `backend/src/index.ts:475-559` - Auto-embed integration

**Testing Results:**
- Vector DB contains 2 deals with 384-dimensional vectors
- Auto-embedding working seamlessly on deal creation
- Semantic search successfully finding similar deals

---

## 🎯 Immediate Next Steps (Week 1-2)

### **Option 1: Advanced Deal Scoring Model (Recommended)**
**Goal**: Train ML model to predict deal win/loss with >75% accuracy

**Why This Next:**
1. Builds directly on vector embeddings (use similarity to predict outcomes)
2. High business value (sales reps need deal risk scores)
3. Foundation for autonomous monitoring (need scores to detect anomalies)
4. Relatively quick win (2-3 weeks to MVP)

**Implementation Plan:**

#### **Step 1: Data Collection & Preparation** (2-3 days) - ✅ COMPLETE
- ✅ Add `outcome` field to deals table (`won`, `lost`, `active`)
- ✅ Database migration applied to production
- ✅ Prisma client regenerated with new fields
- [ ] Generate synthetic training data (100+ deals with outcomes)
- [ ] Real data collection strategy for first 30-60 days

**Files Created:**
- ✅ `backend/prisma/migrations/20251107031042_add_deal_outcome_tracking/migration.sql`
- ⏳ `ai-core/src/utils/synthetic_data_generator.py` (next)

#### **Step 2: Feature Engineering** (2-3 days) - ✅ COMPLETE
- ✅ Created comprehensive feature extraction service with **29 features**:
  - **Temporal** (5): Deal age, time until close, days in stage, overdue status
  - **Value** (3): Deal value, value tiers, log-transformed value
  - **Stage** (2): Stage progression, ordinal encoding
  - **Probability** (4): Normalized probability, confidence flags
  - **Activity** (7): Count, frequency, recency, type breakdown
  - **Similarity** (8): Win/loss ratio from vector-similar deals, similarity scores
- ✅ Integration with vector search for historical pattern matching
- ✅ Feature normalization and scaling built-in

**Files Created:**
- ✅ `ai-core/src/services/feature_engineering.py` (308 lines, production-ready)

#### **Step 3: Model Training** (3-4 days)
- [ ] Choose model architecture (XGBoost or LightGBM)
- [ ] Train binary classifier (win/loss prediction)
- [ ] Hyperparameter tuning (grid search)
- [ ] Cross-validation (k-fold, 5 folds)
- [ ] Model evaluation:
  - Accuracy, Precision, Recall, F1 Score
  - ROC-AUC curve
  - Confusion matrix
- [ ] Save model artifacts (pickle or joblib)

**Files to Create:**
- `ai-core/src/models/deal_scorer.py`
- `ai-core/src/training/train_deal_model.py`
- `ai-core/models/deal_classifier_v1.pkl`

#### **Step 4: API Integration** (2 days)
- [ ] Create scoring endpoint: `POST /api/v1/deals/score`
- [ ] Update forecast to include deal scores
- [ ] Backend integration: score deals on-demand
- [ ] Cache scores to avoid re-computation
- [ ] Add model versioning

**Files to Update:**
- `ai-core/src/main_simple.py` - Add scoring endpoints
- `backend/src/services/aiCoreClient.ts` - Add score methods

#### **Step 5: Frontend Visualization** (2-3 days)
- [ ] Add deal health indicators (color-coded badges)
- [ ] Create deal risk dashboard
- [ ] Show top 10 at-risk deals
- [ ] Display confidence scores on deal cards
- [ ] Add historical accuracy tracking

**Files to Create:**
- `frontend/app/deals/components/DealHealthBadge.tsx`
- `frontend/app/insights/risk-dashboard/page.tsx`

**Total Timeline**: 2-3 weeks to production-ready model

---

### **Option 2: Autonomous Monitoring & Alerts**
**Goal**: 24/7 background monitoring with proactive alerts

**Why This Alternative:**
- Lower complexity (rule-based at first)
- Immediate business value (catch dying deals)
- Can use existing scoring logic
- Sets up infrastructure for future ML models

**Implementation Plan:**

#### **Step 1: Monitoring Worker** (3-4 days)
- [ ] Create cron worker (runs every 30 min)
- [ ] Health check all active deals
- [ ] Detect anomalies:
  - Stale deals (no activity >14 days)
  - Stage stagnation (stuck in stage >30 days)
  - Probability drops (>20% decrease in 7 days)
  - Close date slippage (moved back >7 days)
- [ ] Priority scoring (Critical, High, Medium, Low)

**Files to Create:**
- `ai-core/src/workers/deal_monitor.py`
- `ai-core/src/services/anomaly_detector.py`

#### **Step 2: Alert System** (2-3 days)
- [ ] Create alerts table (PostgreSQL)
- [ ] Alert API endpoints (create, read, dismiss)
- [ ] Alert priority and categorization
- [ ] Deduplication logic (don't spam same alert)

**Files to Create:**
- `backend/prisma/migrations/add_alerts_table.sql`
- `backend/src/services/alert.service.ts`
- `backend/src/repositories/alert.repository.ts`

#### **Step 3: Notification System** (2-3 days)
- [ ] In-app notification UI
- [ ] Email digest (daily summary)
- [ ] Slack integration (optional)
- [ ] Notification preferences per user

**Files to Create:**
- `frontend/app/components/NotificationCenter.tsx`
- `backend/src/services/notification.service.ts`
- `backend/src/utils/email.ts`

**Total Timeline**: 1-2 weeks to MVP

---

## 🔮 Medium-Term Priorities (Weeks 3-6)

### **1. Continuous Learning System**
- [ ] Capture actual deal outcomes automatically
- [ ] Build model retraining pipeline
- [ ] A/B test new models vs production
- [ ] Track model performance drift
- [ ] Feedback loop from sales rep corrections

### **2. Deal Outcome Tracking**
- [ ] Add "Mark as Won/Lost" workflow
- [ ] Capture loss reasons (dropdown + notes)
- [ ] Win analysis (what went right?)
- [ ] Build historical outcome database
- [ ] Feed outcomes back into training data

### **3. Production Qdrant Deployment**
- [ ] Deploy Qdrant to Railway (or Qdrant Cloud)
- [ ] Migrate from in-memory to persistent storage
- [ ] Set up vector DB backups
- [ ] Add monitoring and observability
- [ ] Embed all existing deals in production

---

## 💡 Strategic Decision: Which Path?

### **Recommendation: Start with Deal Scoring Model**

**Reasoning:**
1. **Immediate Value**: Sales teams need to know which deals are at risk
2. **Foundation for Monitoring**: Autonomous monitoring works better with ML scores
3. **Leverages Vector Search**: We just built embeddings - use them for predictions
4. **Clear Success Metric**: 75%+ accuracy is measurable and valuable
5. **Marketing Advantage**: "AI predicts deal outcomes" is a strong selling point

**Alternative Approach**: Build monitoring first if you need faster time-to-value and lower technical risk.

---

## 📊 Success Metrics

### **Deal Scoring Model:**
- **Accuracy**: 75%+ within 90 days
- **Precision**: 70%+ (don't cry wolf)
- **Recall**: 80%+ (catch most at-risk deals)
- **Business Impact**: 20%+ increase in deals saved from loss

### **Autonomous Monitoring:**
- **Alert Relevance**: 70%+ of alerts lead to action
- **False Positive Rate**: <20%
- **Time Saved**: 5+ hours/week per sales rep
- **Deal Velocity**: 15%+ faster close times

---

## 🛠️ Infrastructure Improvements Needed

### **Before Scaling:**
1. **Qdrant Production Deployment** (Week 2-3)
   - Railway service or Qdrant Cloud
   - Persistent storage (don't lose embeddings)
   - Backup strategy

2. **Model Artifact Storage** (Week 3)
   - S3 or Railway volumes for .pkl files
   - Model versioning system
   - Rollback capability

3. **Monitoring & Observability** (Week 4)
   - Sentry for error tracking
   - DataDog or LogRocket for performance
   - Custom metrics dashboard (forecast accuracy over time)

4. **Background Job Infrastructure** (Week 3-4)
   - Bull queue for async jobs
   - Redis for caching
   - Cron scheduler for monitoring worker

---

## 🎓 Learning Resources

### **For Deal Scoring Model:**
- **XGBoost Tutorial**: https://xgboost.readthedocs.io/
- **LightGBM Guide**: https://lightgbm.readthedocs.io/
- **Imbalanced Classification**: https://machinelearningmastery.com/smote-oversampling-for-imbalanced-classification/
- **Feature Engineering**: https://www.kaggle.com/learn/feature-engineering

### **For Deployment:**
- **Railway Docs**: https://docs.railway.app/
- **Qdrant Cloud**: https://qdrant.tech/documentation/cloud/
- **Model Serving**: https://huggingface.co/docs/hub/models-inference

---

## 📅 Suggested Timeline

**Week 1**: Data collection + feature engineering
**Week 2**: Model training + evaluation
**Week 3**: API integration + testing
**Week 4**: Frontend integration + deploy to production
**Week 5**: Monitor performance + collect feedback
**Week 6**: Iterate based on real-world results

---

## 🚀 Let's Ship It!

**Immediate Action Items (Today):**
1. Decide: Deal Scoring Model vs Autonomous Monitoring
2. Set up tracking for deal outcomes (add `outcome` field to schema)
3. Start collecting real deal data with outcomes
4. Review training data requirements

**Ready to move forward with Phase 2.2!**

See `VISION_AND_ROADMAP.md` for full context.
