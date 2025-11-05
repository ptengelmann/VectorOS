"""
Intelligent Insights Generator - RAG-Based AI System
Uses Claude Sonnet 4 with vector memory for context-aware deal analysis
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import logging
import json
import os
from anthropic import Anthropic

logger = logging.getLogger(__name__)


class IntelligentInsightsGenerator:
    """
    Production-grade insights generator using RAG (Retrieval-Augmented Generation)

    Architecture:
    1. Retrieve similar deals from vector memory
    2. Build context-rich prompt with examples
    3. Call Claude Sonnet 4 for intelligent analysis
    4. Parse and validate structured insights
    5. Learn from feedback over time
    """

    def __init__(
        self,
        anthropic_api_key: Optional[str] = None,
        memory_service=None,
        deal_analyzer=None
    ):
        """
        Initialize intelligent insights generator

        Args:
            anthropic_api_key: API key for Anthropic Claude
            memory_service: Vector memory service for RAG
            deal_analyzer: Deal scoring service
        """
        self.anthropic = Anthropic(
            api_key=anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        )
        self.memory = memory_service
        self.deal_analyzer = deal_analyzer

        # System prompt for Claude - defines its role and capabilities
        self.system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        """Build the system prompt that defines Claude's role"""
        return """You are an elite sales intelligence AI, trained on thousands of successful (and failed) enterprise deals.

Your role is to analyze sales deals and provide actionable, data-driven insights that help sales teams:
1. **Prevent deals from going cold** - Detect early warning signs
2. **Accelerate deal velocity** - Identify blockers and opportunities
3. **Increase win rates** - Recommend proven strategies
4. **Optimize sales tactics** - Suggest next best actions

## Analysis Framework

When analyzing a deal, you consider:

### Risk Factors
- **Staleness**: Days since last activity
- **Engagement**: Stakeholder responsiveness
- **Competition**: Competitor presence or mentions
- **Pricing**: Deal size vs. budget fit
- **Timeline**: Days in current stage
- **Champion**: Presence of internal advocate

### Opportunity Signals
- **Momentum**: Increasing engagement frequency
- **Urgency**: Time-sensitive triggers (fiscal year, budget)
- **Expansion**: Multi-product or upsell potential
- **Referenceability**: High-value or marquee customer
- **Quick Win**: High probability, short sales cycle

### Comparative Intelligence
- **Similar Deals**: How comparable deals performed
- **Historical Patterns**: What worked/failed before
- **Industry Benchmarks**: Typical close rates and timelines
- **Seasonal Trends**: Time-of-year effects

## Output Format

Return insights as a JSON array with this structure:
```json
[
  {
    "type": "risk" | "opportunity" | "warning" | "recommendation",
    "title": "Short, actionable title (60 chars max)",
    "description": "Detailed explanation with data points (150 chars max)",
    "priority": "critical" | "high" | "medium" | "low",
    "confidence": 0.0-1.0,
    "data": {
      "deal_id": "...",
      "deal_title": "...",
      "key_metrics": {...}
    },
    "actions": [
      {
        "action": "Specific action to take",
        "priority": "critical" | "high" | "medium",
        "expected_impact": "What this will achieve",
        "timeline": "When to do it"
      }
    ]
  }
]
```

## Quality Standards

- **Actionable**: Every insight must include specific next steps
- **Data-Driven**: Reference specific metrics and patterns
- **Confident**: Only surface insights with >60% confidence
- **Personalized**: Use context from similar deals
- **Concise**: Brief, scannable insights

Be direct, data-driven, and actionable. No fluff."""

    async def generate_workspace_insights(
        self,
        workspace_id: str,
        user_id: Optional[str] = None,
        deals: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate intelligent insights for all deals in a workspace

        This is the main entry point called by the API

        Args:
            workspace_id: Workspace to analyze
            user_id: Optional user ID for personalization
            deals: Optional list of deals (if not provided, uses mock data)

        Returns:
            {
                "success": bool,
                "insights_generated": int,
                "insights": [...],
                "workspace_id": str,
                "generated_at": str
            }
        """
        try:
            logger.info(f"[IntelligentInsights] Generating insights for workspace: {workspace_id}")

            # If no deals provided, this is development/testing mode
            if not deals or len(deals) == 0:
                logger.info(f"[IntelligentInsights] No deals provided for workspace: {workspace_id}")
                return {
                    "success": True,
                    "insights_generated": 0,
                    "insights": [],
                    "workspace_id": workspace_id,
                    "generated_at": datetime.now(timezone.utc).isoformat()
                }

            logger.info(f"[IntelligentInsights] Analyzing {len(deals)} deals")

            # Generate insights for each deal using AI
            all_insights = []
            for deal in deals:
                try:
                    deal_insights = await self._analyze_deal_with_rag(deal, workspace_id)
                    all_insights.extend(deal_insights)
                except Exception as e:
                    logger.error(f"[IntelligentInsights] Error analyzing deal {deal.get('id')}: {str(e)}")
                    continue

            logger.info(f"[IntelligentInsights] Generated {len(all_insights)} insights")

            return {
                "success": True,
                "insights_generated": len(all_insights),
                "insights": all_insights,
                "workspace_id": workspace_id,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            logger.error(f"[IntelligentInsights] Error generating insights: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "insights_generated": 0,
                "insights": []
            }

    async def _analyze_deal_with_rag(
        self,
        deal: Dict[str, Any],
        workspace_id: str
    ) -> List[Dict[str, Any]]:
        """
        Analyze a single deal using RAG (Retrieval-Augmented Generation)

        Steps:
        1. Retrieve similar deals from vector memory
        2. Build context-rich prompt
        3. Call Claude for analysis
        4. Parse and validate response

        Args:
            deal: Deal to analyze
            workspace_id: Workspace context

        Returns:
            List of insights for this deal
        """

        # Step 1: Retrieve similar deals (RAG context)
        similar_deals = []
        if self.memory:
            try:
                similar_deals = await self.memory.find_similar_deals(
                    deal=deal,
                    workspace_id=workspace_id,
                    top_k=5,
                    min_score=0.6
                )
                logger.info(f"[RAG] Found {len(similar_deals)} similar deals for context")
            except Exception as e:
                logger.warning(f"[RAG] Memory search failed: {str(e)}")

        # Step 2: Build context-rich prompt
        prompt = self._build_rag_prompt(deal, similar_deals)

        # Step 3: Call Claude for intelligent analysis
        try:
            logger.info(f"[Claude] Calling API for deal: {deal.get('title')}")
            logger.info(f"[Claude] Prompt length: {len(prompt)} chars")

            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",  # Latest Sonnet 4
                max_tokens=4000,
                system=self.system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # Extract response text
            response_text = response.content[0].text

            logger.info(f"[Claude] ===== RAW RESPONSE START =====")
            logger.info(f"[Claude] {response_text}")
            logger.info(f"[Claude] ===== RAW RESPONSE END =====")
            logger.info(f"[Claude] Response length: {len(response_text)} chars")

            # Step 4: Parse and validate insights
            insights = self._parse_claude_response(response_text, deal)

            logger.info(f"[Claude] Parsed {len(insights)} insights from response")
            if len(insights) == 0:
                logger.warning(f"[Claude] ⚠️  WARNING: Claude returned 0 insights!")
                logger.warning(f"[Claude] Deal data was: {json.dumps(deal, default=str)}")

            return insights

        except Exception as e:
            logger.error(f"[Claude] API error: {str(e)}", exc_info=True)
            return []

    def _build_rag_prompt(
        self,
        deal: Dict[str, Any],
        similar_deals: List[Dict[str, Any]]
    ) -> str:
        """
        Build a context-rich prompt with similar deals for RAG

        This is where the magic happens - we give Claude:
        - The current deal to analyze
        - Similar past deals with outcomes
        - Patterns and trends

        Args:
            deal: Current deal to analyze
            similar_deals: Similar past deals for context

        Returns:
            Formatted prompt string
        """

        # Calculate deal metrics
        created_at = deal.get("createdAt")
        updated_at = deal.get("updatedAt")

        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))

        # Ensure timezone awareness
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if updated_at and updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        days_old = (now - created_at).days if created_at else 0
        days_since_update = (now - updated_at).days if updated_at else 0

        # Format current deal
        current_deal_json = json.dumps({
            "id": deal.get("id"),
            "title": deal.get("title"),
            "company": deal.get("company"),
            "value": deal.get("value"),
            "stage": deal.get("stage"),
            "probability": deal.get("probability"),
            "contact_name": deal.get("contactName"),
            "contact_email": deal.get("contactEmail"),
            "days_old": days_old,
            "days_since_last_activity": days_since_update,
            "close_date": deal.get("closeDate"),
        }, indent=2)

        # Format similar deals (if any)
        similar_deals_context = ""
        if similar_deals:
            similar_deals_context = "\n## SIMILAR PAST DEALS (for context)\n\n"
            for i, similar in enumerate(similar_deals[:5], 1):
                similar_deals_context += f"""### Similar Deal #{i}
- Title: {similar.get('title', 'Unknown')}
- Value: ${similar.get('value', 0):,}
- Stage: {similar.get('stage', 'Unknown')}
- Outcome: {similar.get('outcome', 'Unknown')}
- Days to close: {similar.get('days_to_close', 'N/A')}
- Notes: {similar.get('notes', 'N/A')}

"""
        else:
            similar_deals_context = "\n## SIMILAR PAST DEALS\n\nNo similar deals found in history. Analyze based on general sales best practices.\n"

        # Build the full prompt
        prompt = f"""Analyze this sales deal and provide actionable insights.

## CURRENT DEAL TO ANALYZE

{current_deal_json}

{similar_deals_context}

## YOUR TASK

Analyze this deal and identify:

1. **Risks** - What could cause this deal to stall or fail?
2. **Opportunities** - How can we accelerate or expand this deal?
3. **Next Actions** - What specific steps should the sales team take?

Consider:
- Is there enough recent activity? (Red flag if >7 days inactive)
- Is the probability realistic for this stage?
- Are there patterns from similar deals?
- What are the biggest risks?
- What are quick win opportunities?

Return your analysis as a JSON array of insights. Only include insights with >60% confidence.

Remember:
- Be specific and actionable
- Reference data points
- Prioritize by impact
- Keep it concise

Return ONLY the JSON array, no other text."""

        return prompt

    def _parse_claude_response(
        self,
        response_text: str,
        deal: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Parse Claude's response into structured insights

        Claude should return a JSON array, but we need to:
        1. Extract JSON from markdown code blocks if present
        2. Validate structure
        3. Add default fields if missing

        Args:
            response_text: Raw response from Claude
            deal: Original deal for context

        Returns:
            List of validated insights
        """
        try:
            # Try to extract JSON from markdown code blocks
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            else:
                json_str = response_text.strip()

            # Parse JSON
            insights = json.loads(json_str)

            # Ensure it's a list
            if not isinstance(insights, list):
                insights = [insights]

            # Validate and enrich each insight
            validated_insights = []
            for insight in insights:
                # Ensure required fields
                validated_insight = {
                    "type": insight.get("type", "recommendation"),
                    "title": insight.get("title", "")[:100],  # Limit length
                    "description": insight.get("description", "")[:300],
                    "priority": insight.get("priority", "medium"),
                    "confidence": min(max(insight.get("confidence", 0.7), 0.0), 1.0),
                    "data": insight.get("data", {}),
                    "actions": insight.get("actions", [])
                }

                # Ensure data has deal context
                if "deal_id" not in validated_insight["data"]:
                    validated_insight["data"]["deal_id"] = deal.get("id")
                if "deal_title" not in validated_insight["data"]:
                    validated_insight["data"]["deal_title"] = deal.get("title")
                if "deal_value" not in validated_insight["data"]:
                    validated_insight["data"]["deal_value"] = deal.get("value")

                validated_insights.append(validated_insight)

            return validated_insights

        except json.JSONDecodeError as e:
            logger.error(f"[Parse] Failed to parse Claude response as JSON: {str(e)}")
            logger.error(f"[Parse] Response was: {response_text}")
            return []
        except Exception as e:
            logger.error(f"[Parse] Error parsing response: {str(e)}", exc_info=True)
            return []
