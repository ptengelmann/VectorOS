# VectorOS AI Insights Architecture
## Production-Grade, Trainable System

### Vision
Build an AI system that learns from every deal, every outcome, and every user interaction to provide increasingly accurate, personalized insights.

---

## Phase 1: Intelligent RAG System (Now - Month 1)

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Insight Generation Flow                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Deal Data → Embedding (text-embedding-3-large)          │
│                                                              │
│  2. Vector Search → Retrieve Similar Deals                  │
│     - Same industry                                          │
│     - Similar deal size                                      │
│     - Same stage                                             │
│     - Past outcomes (won/lost)                               │
│                                                              │
│  3. Context Assembly                                         │
│     - Current deal details                                   │
│     - 5-10 most similar past deals                          │
│     - Historical patterns                                    │
│     - Workspace-specific rules                               │
│                                                              │
│  4. Claude Prompt (Few-shot)                                │
│     - You are a sales intelligence expert...                │
│     - Here are similar deals and their outcomes...           │
│     - Analyze this deal and provide insights...              │
│                                                              │
│  5. Structured Output                                        │
│     - Parse JSON response                                    │
│     - Validate insights                                      │
│     - Store in database                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. **Vector Memory Service** (Already exists)
```python
class VectorMemoryService:
    def store_deal(self, deal: Deal, outcome: str):
        """Store deal with outcome for future learning"""

    def find_similar_deals(self, deal: Deal, top_k=10):
        """Find similar deals with known outcomes"""

    def find_patterns(self, workspace_id: str):
        """Find patterns across all deals"""
```

#### 2. **Insight Generator v2** (New)
```python
class IntelligentInsightsGenerator:
    def __init__(self, anthropic_client, vector_memory):
        self.claude = anthropic_client
        self.memory = vector_memory

    async def generate_insights(self, deal: Deal):
        # 1. Find similar deals
        similar = await self.memory.find_similar_deals(deal)

        # 2. Build context-rich prompt
        prompt = self._build_rag_prompt(deal, similar)

        # 3. Call Claude with structured output
        insights = await self.claude.messages.create(
            model="claude-sonnet-4",
            max_tokens=2000,
            system=SALES_INTELLIGENCE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )

        # 4. Parse and validate
        return self._parse_insights(insights.content)

    def _build_rag_prompt(self, deal, similar_deals):
        """Build context-rich prompt with examples"""
        return f"""
        Analyze this deal and provide actionable insights:

        CURRENT DEAL:
        {json.dumps(deal, indent=2)}

        SIMILAR PAST DEALS (with outcomes):
        {self._format_similar_deals(similar_deals)}

        ANALYSIS REQUIRED:
        1. Risk assessment (what could go wrong)
        2. Opportunity identification (how to accelerate)
        3. Next best actions (specific, actionable)
        4. Win probability (with reasoning)

        Return insights as JSON array...
        """
```

#### 3. **Feedback Loop** (Critical for learning)
```python
class InsightFeedbackService:
    async def record_feedback(
        self,
        insight_id: str,
        feedback_type: str,  # "helpful" | "not_helpful" | "incorrect"
        deal_outcome: Optional[str] = None  # "won" | "lost"
    ):
        """
        Store feedback to improve future insights

        This data becomes training data for:
        - Prompt engineering improvements
        - Fine-tuning dataset
        - Pattern detection
        """
        await self.db.feedback.create({
            "insightId": insight_id,
            "feedbackType": feedback_type,
            "dealOutcome": deal_outcome,
            "timestamp": datetime.now()
        })

        # Trigger retraining if threshold met
        if await self._should_retrain():
            await self._queue_model_update()
```

---

## Phase 2: Data Collection & Labeling (Month 2-3)

### Goal
Collect 500+ labeled examples for fine-tuning

### Strategy
1. **Implicit Feedback**
   - Track which insights users act on
   - Measure deal velocity after insights
   - Correlate insights with outcomes

2. **Explicit Feedback**
   - "Was this helpful?" buttons
   - "Mark as accurate/inaccurate"
   - Free-text feedback

3. **Outcome Tracking**
   - Deal won → Which insights were shown?
   - Deal lost → What did we miss?
   - Deal accelerated → Which action worked?

### Data Schema
```json
{
  "deal_snapshot": {
    "id": "...",
    "value": 50000,
    "stage": "negotiation",
    "days_in_stage": 14,
    "contact_engagement": "medium",
    "competitor_presence": true
  },
  "generated_insight": {
    "type": "risk",
    "title": "Competitor threat detected",
    "confidence": 0.85,
    "actions": [...]
  },
  "user_feedback": {
    "helpful": true,
    "acted_on": true,
    "action_taken": "Called customer immediately",
    "outcome_improvement": "Deal velocity +3 days"
  },
  "actual_outcome": {
    "result": "won",
    "close_date": "2025-11-15",
    "final_value": 55000
  }
}
```

---

## Phase 3: Fine-Tuning (Month 4-6)

### When to Fine-Tune
- Collected 500+ labeled examples
- Clear patterns in feedback data
- ROI justifies fine-tuning costs

### Anthropic Fine-Tuning Process
```python
# 1. Prepare training data
training_data = []
for example in labeled_examples:
    training_data.append({
        "messages": [
            {
                "role": "user",
                "content": format_deal_for_analysis(example.deal)
            },
            {
                "role": "assistant",
                "content": format_ideal_insight(
                    example.actual_outcome,
                    example.user_feedback
                )
            }
        ]
    })

# 2. Create fine-tuning job
anthropic.fine_tuning.create(
    model="claude-3-5-sonnet-20241022",
    training_data=training_data,
    validation_data=validation_split,
    hyperparameters={
        "epochs": 3,
        "learning_rate": 1e-5
    }
)

# 3. Deploy fine-tuned model
# Use fine-tuned model ID for production insights
```

---

## Implementation Priorities

### Week 1: Foundation
- [ ] Rebuild insights generator with RAG approach
- [ ] Implement vector similarity search
- [ ] Create structured prompt templates
- [ ] Add JSON schema validation

### Week 2: Intelligence
- [ ] Build context-rich prompts with examples
- [ ] Implement multi-stage analysis (risk, opportunity, actions)
- [ ] Add confidence scoring
- [ ] Create insight quality metrics

### Week 3: Feedback Loop
- [ ] Add feedback buttons to UI
- [ ] Track insight effectiveness
- [ ] Store outcomes with deals
- [ ] Build feedback analytics dashboard

### Week 4: Learning
- [ ] Automatic prompt improvement from feedback
- [ ] A/B test different prompt strategies
- [ ] Build training data pipeline
- [ ] Plan fine-tuning roadmap

---

## Success Metrics

### Quality Metrics
- **Accuracy**: % of insights that led to correct predictions
- **Helpfulness**: User feedback score (1-5 stars)
- **Action Rate**: % of insights acted upon
- **Win Rate Impact**: Deal win rate with vs without insights

### Learning Metrics
- **Improvement Over Time**: Accuracy trend month-over-month
- **Personalization**: Performance on workspace-specific patterns
- **Coverage**: % of deals with actionable insights

### Business Metrics
- **Deal Velocity**: Days saved per deal
- **Revenue Impact**: $ attributed to insights
- **User Engagement**: Daily active users of insights
- **Retention**: Users returning for insights

---

## Technology Stack

### Vector Database
**Recommendation**: **Qdrant** (open-source, self-hosted)
- Free for unlimited scale
- High performance
- Easy Python integration
- Can run locally or cloud

**Alternative**: Pinecone (paid, managed)

### LLM Provider
- **Primary**: Anthropic Claude Sonnet 4 (via API)
- **Future**: Fine-tuned Claude (when data sufficient)
- **Fallback**: GPT-4 for comparison/validation

### Storage
- **Deals**: PostgreSQL (current)
- **Vectors**: Qdrant
- **Feedback**: PostgreSQL (same DB)
- **Training Data**: JSON files → S3/local

---

## Competitive Advantage

### Why This Approach Wins

1. **Learns Your Business**
   - Not generic SaaS insights
   - Trained on YOUR deals, YOUR patterns

2. **Gets Smarter Over Time**
   - Every deal improves the system
   - Compounds value with usage

3. **Personalized Per Workspace**
   - Enterprise customers get custom models
   - SMBs benefit from aggregated learning

4. **Defensible Moat**
   - Data network effects
   - Switching costs (lose trained model)
   - Institutional knowledge capture

---

## Next Steps

**Want me to build this?**

I can implement:
1. **Phase 1 RAG system** (2-3 hours)
   - Rebuild insights generator with Claude
   - Implement vector search
   - Create intelligent prompts

2. **Feedback infrastructure** (1 hour)
   - Add UI feedback buttons
   - Store feedback data
   - Build analytics

3. **Training data pipeline** (1 hour)
   - Prepare for future fine-tuning
   - Export format for Anthropic

**Total**: ~4-5 hours to production-grade, trainable AI system

Should I proceed?
