"""
VectorOS Insights Analyzer Service

Analyzes workspace deals and generates AI-powered insights:
- Priority deals to focus on
- Risk assessment
- Action recommendations
- Predictive analytics
"""

import anthropic
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json

from ..config import settings
from ..utils.logger import get_logger

logger = get_logger(__name__)


class InsightsAnalyzer:
    """
    AI-powered insights generator for workspace deals
    """

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-5-20250929"  # Claude Sonnet 4.5 (latest)

    def analyze_workspace(self, deals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze all deals in a workspace and generate insights

        Args:
            deals: List of deal dictionaries with all deal data

        Returns:
            List of insight objects ready to be stored in database
        """
        logger.info(f"Analyzing workspace with {len(deals)} deals")

        if not deals or len(deals) == 0:
            logger.warning("No deals to analyze")
            return []

        try:
            # Build analysis prompt
            prompt = self._build_analysis_prompt(deals)

            # Call Claude for analysis
            message = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                temperature=0.7,
                system=self._get_system_prompt(),
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # Parse response
            response_text = message.content[0].text
            logger.debug(f"Claude response: {response_text[:500]}...")

            # Extract insights from response
            insights = self._parse_insights(response_text, deals)

            logger.info(f"Generated {len(insights)} insights")
            return insights

        except Exception as e:
            logger.error(f"Error analyzing workspace: {str(e)}", exc_info=True)
            raise

    def _get_system_prompt(self) -> str:
        """
        System prompt for Claude - defines the AI's role and output format
        """
        return """You are VectorOS, an AI-powered business intelligence system. Your job is to analyze sales pipeline deals and provide actionable insights to help users close more deals faster.

You analyze deals across multiple dimensions:
1. Priority - which deals should the user focus on today
2. Risk - which deals are in danger of going cold or being lost
3. Opportunity - where there's potential for upsells or accelerated closes
4. Actions - specific steps the user should take

For each insight, you provide:
- A clear, actionable title (max 10 words)
- Detailed description explaining WHY and WHAT TO DO
- Priority level (critical, high, medium, low)
- Confidence score (0.0 to 1.0)
- Suggested actions as a list

Output your analysis as a JSON array of insights. Each insight object should have:
{
  "type": "priority" | "risk" | "opportunity" | "prediction",
  "title": "Clear actionable title",
  "description": "Detailed explanation with reasoning and suggested actions",
  "priority": "critical" | "high" | "medium" | "low",
  "confidence": 0.0 to 1.0,
  "dealIds": ["id1", "id2"],
  "actions": ["Action 1", "Action 2"],
  "data": {"any": "supporting data"}
}

Be direct, actionable, and specific. Focus on insights that will actually help close deals."""

    def _build_analysis_prompt(self, deals: List[Dict[str, Any]]) -> str:
        """
        Build the analysis prompt with deal data
        """
        # Calculate some aggregate stats
        total_value = sum(d.get('value', 0) or 0 for d in deals)
        avg_probability = sum(d.get('probability', 0) or 0 for d in deals) / len(deals) if deals else 0

        # Group deals by stage
        by_stage = {}
        for deal in deals:
            stage = deal.get('stage', 'unknown')
            if stage not in by_stage:
                by_stage[stage] = []
            by_stage[stage].append(deal)

        # Build prompt
        prompt = f"""Analyze this sales pipeline and generate 3-5 key insights.

**Pipeline Overview:**
- Total pipeline value: ${total_value:,.0f}
- Number of deals: {len(deals)}
- Average probability: {avg_probability:.1f}%
- Stages: {', '.join(f'{k}({len(v)})' for k, v in by_stage.items())}

**Deals to Analyze:**

"""

        # Add each deal
        for i, deal in enumerate(deals, 1):
            prompt += f"""
**Deal {i}: {deal.get('title', 'Untitled')}**
- ID: {deal.get('id')}
- Value: ${deal.get('value', 0):,.0f}
- Stage: {deal.get('stage', 'unknown')}
- Probability: {deal.get('probability', 0)}%
- Company: {deal.get('company', 'N/A')}
- Contact: {deal.get('contactName', 'N/A')} ({deal.get('contactEmail', 'N/A')})
- Close Date: {deal.get('closeDate', 'Not set')}
- Last Updated: {deal.get('updatedAt', 'Unknown')}
- Created: {deal.get('createdAt', 'Unknown')}

"""

        prompt += """

**Your Task:**

Analyze these deals and generate 3-5 insights that will help the user:
1. Prioritize which deals to focus on TODAY
2. Identify deals at risk of going cold
3. Spot opportunities for quick wins or upsells
4. Predict which deals will close and when
5. Recommend specific actions to take

Output your analysis as a JSON array of insights. Be specific, actionable, and reference actual deal data."""

        return prompt

    def _parse_insights(self, response_text: str, deals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Parse Claude's response into structured insights
        """
        try:
            # Try to extract JSON from response
            # Sometimes Claude wraps JSON in markdown code blocks
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                # Try to find JSON array
                json_start = response_text.find("[")
                json_end = response_text.rfind("]") + 1
                json_text = response_text[json_start:json_end].strip()

            # Parse JSON
            insights = json.loads(json_text)

            # Ensure insights is a list
            if not isinstance(insights, list):
                insights = [insights]

            # Validate and clean each insight
            cleaned_insights = []
            for insight in insights:
                if not isinstance(insight, dict):
                    continue

                # Ensure required fields
                cleaned = {
                    "type": insight.get("type", "recommendation"),
                    "title": insight.get("title", "Untitled Insight"),
                    "description": insight.get("description", ""),
                    "priority": insight.get("priority", "medium"),
                    "confidence": float(insight.get("confidence", 0.8)),
                    "data": insight.get("data") or {},
                    "actions": insight.get("actions") or []
                }

                # Convert actions to JSON if it's a list
                if isinstance(cleaned["actions"], list):
                    cleaned["actions"] = json.dumps(cleaned["actions"])

                # Convert data to JSON if needed
                if not isinstance(cleaned["data"], str):
                    cleaned["data"] = json.dumps(cleaned["data"])

                cleaned_insights.append(cleaned)

            return cleaned_insights

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Claude response: {str(e)}")
            logger.debug(f"Response text: {response_text}")

            # Fallback: create a single insight with the raw response
            return [{
                "type": "recommendation",
                "title": "AI Analysis Complete",
                "description": response_text[:500],
                "priority": "medium",
                "confidence": 0.7,
                "data": json.dumps({}),
                "actions": json.dumps([])
            }]

        except Exception as e:
            logger.error(f"Error parsing insights: {str(e)}", exc_info=True)
            raise
