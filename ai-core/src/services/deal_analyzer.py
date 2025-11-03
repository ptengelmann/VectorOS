"""
Enterprise Deal Analyzer
LLM-powered deep analysis with structured insights, predictions, and recommendations
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
from anthropic import Anthropic
from ..config import settings

class DealAnalyzer:
    """
    Enterprise-grade deal analysis using Claude AI
    Provides deep insights, win probability predictions, risk assessment, and recommendations
    """

    def __init__(self):
        """Initialize the analyzer with Claude API"""
        api_key = settings.anthropic_api_key
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")

        self.client = Anthropic(api_key=api_key)
        # Using Claude Sonnet 4.5 - latest and best model as of 2025
        self.model = "claude-sonnet-4-5-20250929"

    def analyze_deal(
        self,
        deal: Dict[str, Any],
        workspace_deals: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive AI-powered deal analysis

        Args:
            deal: The deal to analyze
            workspace_deals: Other deals in workspace for context

        Returns:
            Structured analysis with insights, predictions, and recommendations
        """

        # Build context about the deal and workspace
        context = self._build_analysis_context(deal, workspace_deals or [])

        # Generate AI analysis using Claude
        analysis = self._generate_llm_analysis(deal, context)

        # Structure the response
        return {
            "deal_id": deal["id"],
            "deal_title": deal["title"],
            "analyzed_at": datetime.utcnow().isoformat(),
            "analysis": analysis,
            "metadata": {
                "model": self.model,
                "context_deals": len(workspace_deals or [])
            }
        }

    def _build_analysis_context(
        self,
        deal: Dict[str, Any],
        workspace_deals: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Build contextual information for analysis"""

        # Calculate workspace statistics
        total_deals = len(workspace_deals)
        avg_deal_size = sum(d.get("value", 0) for d in workspace_deals) / max(total_deals, 1)

        # Find similar deals (same stage)
        similar_deals = [d for d in workspace_deals if d.get("stage") == deal.get("stage")]

        # Calculate stage-specific metrics
        stage_stats = {
            "total_in_stage": len(similar_deals),
            "avg_value_in_stage": sum(d.get("value", 0) for d in similar_deals) / max(len(similar_deals), 1),
            "avg_probability_in_stage": sum(d.get("probability", 0) for d in similar_deals) / max(len(similar_deals), 1)
        }

        # Calculate deal age
        created_at = datetime.fromisoformat(deal.get("createdAt", "").replace('Z', '+00:00'))
        deal_age_days = (datetime.now(created_at.tzinfo) - created_at).days

        # Calculate time to close
        close_date_str = deal.get("closeDate")
        days_to_close = None
        if close_date_str:
            try:
                close_date = datetime.fromisoformat(close_date_str.replace('Z', '+00:00'))
                days_to_close = (close_date - datetime.now(close_date.tzinfo)).days
            except:
                pass

        return {
            "deal_age_days": deal_age_days,
            "days_to_close": days_to_close,
            "workspace_avg_value": avg_deal_size,
            "stage_stats": stage_stats,
            "total_workspace_deals": total_deals,
            "value_percentile": self._calculate_percentile(
                deal.get("value", 0),
                [d.get("value", 0) for d in workspace_deals]
            )
        }

    def _calculate_percentile(self, value: float, values: List[float]) -> float:
        """Calculate what percentile this value is in the list"""
        if not values:
            return 50.0

        sorted_values = sorted(values)
        position = sum(1 for v in sorted_values if v <= value)
        return (position / len(sorted_values)) * 100

    def _generate_llm_analysis(
        self,
        deal: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate structured analysis using Claude"""

        # Build the analysis prompt
        prompt = self._build_analysis_prompt(deal, context)

        # Call Claude API
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.3,  # Lower temperature for more consistent analysis
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # Parse the JSON response
            analysis_text = response.content[0].text
            analysis = json.loads(analysis_text)

            return analysis

        except Exception as e:
            # Fallback to structured empty response if AI fails
            return self._get_fallback_analysis(str(e))

    def _build_analysis_prompt(
        self,
        deal: Dict[str, Any],
        context: Dict[str, Any]
    ) -> str:
        """Build the prompt for Claude"""

        return f"""You are an expert sales analyst for an enterprise CRM system. Analyze this deal and provide structured insights.

Deal Information:
- Title: {deal.get('title', 'Unknown')}
- Value: ${deal.get('value', 0):,.0f}
- Stage: {deal.get('stage', 'unknown')}
- Probability: {deal.get('probability', 0)}%
- Company: {deal.get('company', 'N/A')}
- Contact: {deal.get('contactName', 'N/A')}
- Created: {deal.get('createdAt', 'N/A')}
- Close Date: {deal.get('closeDate', 'N/A')}

Context:
- Deal age: {context['deal_age_days']} days
- Days until close: {context['days_to_close']}
- Value percentile in workspace: {context['value_percentile']:.1f}%
- Workspace average deal: ${context['workspace_avg_value']:,.0f}
- Deals in same stage: {context['stage_stats']['total_in_stage']}
- Average probability in stage: {context['stage_stats']['avg_probability_in_stage']:.1f}%

Provide a comprehensive analysis in the following JSON format:

{{
  "executive_summary": "2-3 sentence overview of deal health and outlook",
  "win_probability": 75.5,
  "win_probability_reasoning": "Explanation of the win probability assessment",
  "strengths": [
    "Key strength 1",
    "Key strength 2",
    "Key strength 3"
  ],
  "risks": [
    {{
      "risk": "Description of risk",
      "severity": "high|medium|low",
      "mitigation": "Suggested mitigation strategy"
    }}
  ],
  "next_best_actions": [
    {{
      "action": "Specific action to take",
      "priority": "critical|high|medium|low",
      "expected_impact": "Expected outcome",
      "timeline": "When to do it"
    }}
  ],
  "competitive_insights": "Analysis of competitive position if applicable",
  "timing_analysis": "Assessment of deal timing and urgency",
  "recommended_focus_areas": [
    "Area 1 to focus on",
    "Area 2 to focus on"
  ],
  "confidence_level": 85.0
}}

Respond ONLY with valid JSON, no markdown or additional text."""

    def _get_fallback_analysis(self, error: str) -> Dict[str, Any]:
        """Provide fallback analysis if AI fails"""
        return {
            "executive_summary": "Analysis temporarily unavailable. Basic deal metrics are still accessible through the health score.",
            "win_probability": 50.0,
            "win_probability_reasoning": "Unable to calculate detailed probability at this time.",
            "strengths": ["Deal is being tracked in the system"],
            "risks": [
                {
                    "risk": "AI analysis temporarily unavailable",
                    "severity": "low",
                    "mitigation": "Refresh to try again"
                }
            ],
            "next_best_actions": [
                {
                    "action": "Review deal manually and update key fields",
                    "priority": "medium",
                    "expected_impact": "Better tracking",
                    "timeline": "Today"
                }
            ],
            "competitive_insights": "N/A",
            "timing_analysis": "Review close date and update as needed",
            "recommended_focus_areas": ["Data quality", "Regular updates"],
            "confidence_level": 0.0,
            "error": error
        }
