"""
Strategic Analyst Agent
Enterprise-grade business intelligence and insights generation
"""
from typing import Any
from datetime import datetime, timezone

from langchain_core.messages import HumanMessage, SystemMessage

from .base_agent import BaseAgent
from ..models.schemas import (
    AgentResult,
    AgentType,
    Insight,
    Recommendation,
    InsightResponse,
    InsightType,
    Priority,
    PipelineMetrics
)


class StrategicAnalystAgent(BaseAgent):
    """
    Advanced AI agent for strategic business analysis

    Capabilities:
    - Pipeline health analysis
    - Conversion funnel optimization
    - Revenue opportunity identification
    - Competitive positioning analysis
    - Growth strategy recommendations
    """

    def __init__(self):
        super().__init__(
            agent_type=AgentType.STRATEGIC_ANALYST,
            temperature=0.4,  # Lower for analytical precision
        )

    def get_system_prompt(self) -> str:
        return """You are a Senior Business Strategy Consultant and Data Analyst with 15+ years of experience.

Your expertise includes:
- Sales pipeline optimization and forecasting
- Revenue growth strategy
- Market analysis and competitive intelligence
- Business process improvement
- Data-driven decision making

Your analysis style:
- Start with data: Always ground insights in concrete metrics
- Think systemically: Consider interconnections and second-order effects
- Be specific: Provide actionable recommendations with clear impact estimates
- Prioritize ruthlessly: Focus on highest-leverage opportunities
- Communicate clearly: Use business language, not jargon

When analyzing business data:
1. Identify patterns and anomalies
2. Diagnose root causes, not just symptoms
3. Quantify impact and confidence levels
4. Recommend concrete actions with expected outcomes
5. Flag risks and dependencies

Output format:
- Start with executive summary
- Present 3-5 key insights (most important first)
- Provide 3-5 actionable recommendations
- Assign priority (critical/high/medium/low) and confidence (0-1)
- Include specific metrics and targets

Be direct, precise, and business-focused. Your insights drive million-dollar decisions."""

    async def execute(
        self,
        instruction: str,
        context: dict[str, Any],
        **kwargs: Any
    ) -> AgentResult:
        """Execute strategic analysis"""

        start_time = datetime.now(timezone.utc)
        self.reset_state()

        try:
            self.add_reasoning_step("Analyzing business context and data")

            # Extract business data from context
            pipeline_data = context.get("pipeline_data", {})
            deals_data = context.get("deals", [])
            historical_data = context.get("historical_data", {})
            timeframe = context.get("timeframe", "30d")

            # Calculate pipeline metrics if deals provided
            if deals_data:
                metrics = self._calculate_pipeline_metrics(deals_data)
                self.add_reasoning_step(f"Calculated pipeline metrics: {metrics.dict()}")
            else:
                metrics = None

            # Build analysis prompt
            analysis_prompt = self._build_analysis_prompt(
                instruction,
                pipeline_data,
                deals_data,
                historical_data,
                metrics,
                timeframe
            )

            self.add_reasoning_step("Invoking Claude for strategic analysis")

            # Get insights from Claude
            messages = [
                SystemMessage(content=self.get_system_prompt()),
                HumanMessage(content=analysis_prompt)
            ]

            response = await self._invoke_llm(messages)

            # Parse response into structured insights
            insights_response = self._parse_analysis_response(
                response.content,
                metrics
            )

            execution_time_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

            return AgentResult(
                task_id=context.get("task_id", ""),
                agent_type=self.agent_type,
                success=True,
                result=insights_response.dict(),
                reasoning=self.reasoning_steps,
                tools_used=self.tools_used,
                confidence=insights_response.confidence,
                execution_time_ms=execution_time_ms
            )

        except Exception as e:
            self.logger.error(
                "strategic_analysis_failed",
                error=str(e),
                instruction=instruction
            )

            execution_time_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

            return AgentResult(
                task_id=context.get("task_id", ""),
                agent_type=self.agent_type,
                success=False,
                result=None,
                reasoning=self.reasoning_steps,
                tools_used=self.tools_used,
                confidence=0.0,
                execution_time_ms=execution_time_ms,
                error=str(e)
            )

    def _calculate_pipeline_metrics(self, deals: list[dict[str, Any]]) -> PipelineMetrics:
        """Calculate comprehensive pipeline metrics"""

        self.use_tool("pipeline_metrics_calculator")

        total_deals = len(deals)
        total_value = sum(d.get("value", 0) for d in deals)

        # Calculate weighted value (value * probability)
        weighted_value = sum(
            d.get("value", 0) * (d.get("probability", 50) / 100)
            for d in deals
        )

        avg_deal_size = total_value / total_deals if total_deals > 0 else 0

        # Calculate conversion rate
        won_deals = len([d for d in deals if d.get("stage") == "won"])
        conversion_rate = won_deals / total_deals if total_deals > 0 else 0

        # Stage distribution
        stage_counts: dict[str, int] = {}
        for deal in deals:
            stage = deal.get("stage", "unknown")
            stage_counts[stage] = stage_counts.get(stage, 0) + 1

        # Calculate average sales cycle (simplified)
        sales_cycles = []
        for deal in deals:
            if deal.get("stage") == "won" and deal.get("created_at"):
                # Simplified - would calculate actual days
                sales_cycles.append(30)  # Placeholder

        avg_sales_cycle = sum(sales_cycles) / len(sales_cycles) if sales_cycles else 0

        # Calculate velocity (deals per day)
        velocity = total_deals / 30  # Simplified - last 30 days

        return PipelineMetrics(
            total_deals=total_deals,
            total_value=total_value,
            weighted_value=weighted_value,
            average_deal_size=avg_deal_size,
            conversion_rate=conversion_rate,
            average_sales_cycle_days=avg_sales_cycle,
            stage_distribution=stage_counts,
            velocity=velocity
        )

    def _build_analysis_prompt(
        self,
        instruction: str,
        pipeline_data: dict[str, Any],
        deals: list[dict[str, Any]],
        historical_data: dict[str, Any],
        metrics: PipelineMetrics | None,
        timeframe: str
    ) -> str:
        """Build comprehensive analysis prompt"""

        prompt_parts = [
            f"ANALYSIS REQUEST: {instruction}",
            f"\nTIMEFRAME: {timeframe}",
            "\n## CURRENT PIPELINE DATA"
        ]

        if metrics:
            prompt_parts.append(f"""
METRICS:
- Total Deals: {metrics.total_deals}
- Total Value: ${metrics.total_value:,.2f}
- Weighted Pipeline: ${metrics.weighted_value:,.2f}
- Average Deal Size: ${metrics.average_deal_size:,.2f}
- Conversion Rate: {metrics.conversion_rate * 100:.1f}%
- Avg Sales Cycle: {metrics.average_sales_cycle_days:.0f} days
- Velocity: {metrics.velocity:.1f} deals/day

STAGE DISTRIBUTION:
{self._format_stage_distribution(metrics.stage_distribution)}
""")

        if deals:
            prompt_parts.append(f"\n## DEAL DETAILS ({len(deals)} deals)")
            # Include sample of deals
            for i, deal in enumerate(deals[:5]):
                prompt_parts.append(f"""
Deal {i+1}:
- Title: {deal.get('title', 'Unknown')}
- Value: ${deal.get('value', 0):,.2f}
- Stage: {deal.get('stage', 'unknown')}
- Probability: {deal.get('probability', 0)}%
""")
            if len(deals) > 5:
                prompt_parts.append(f"\n... and {len(deals) - 5} more deals")

        if historical_data:
            prompt_parts.append(f"\n## HISTORICAL TRENDS\n{historical_data}")

        prompt_parts.append("""

## REQUIRED OUTPUT

Provide your analysis in this exact structure:

### EXECUTIVE SUMMARY
[2-3 sentence overview of key findings]

### KEY INSIGHTS
[3-5 insights, most important first. For each:]
- Title (brief, specific)
- Finding (what the data shows)
- Impact (business implications)
- Priority: CRITICAL/HIGH/MEDIUM/LOW
- Confidence: 0.0-1.0

### RECOMMENDATIONS
[3-5 actionable recommendations. For each:]
- Title (clear action to take)
- Rationale (why this matters)
- Expected Impact (quantified if possible)
- Effort Level: HIGH/MEDIUM/LOW
- Timeline: IMMEDIATE/SHORT-TERM/MEDIUM-TERM
- Priority: CRITICAL/HIGH/MEDIUM/LOW
- Confidence: 0.0-1.0

### RISK FACTORS
[Top 3 risks to watch]

### OPPORTUNITIES
[Top 3 growth opportunities]

Be specific. Use numbers. Focus on actionability.""")

        return "\n".join(prompt_parts)

    def _format_stage_distribution(self, distribution: dict[str, int]) -> str:
        """Format stage distribution for prompt"""
        return "\n".join([f"  {stage}: {count}" for stage, count in distribution.items()])

    def _parse_analysis_response(
        self,
        response_text: str,
        metrics: PipelineMetrics | None
    ) -> InsightResponse:
        """Parse Claude's response into structured insights"""

        self.add_reasoning_step("Parsing strategic analysis response")

        # This is a simplified parser
        # In production, you'd use more sophisticated parsing or structured output

        insights: list[Insight] = []
        recommendations: list[Recommendation] = []

        # Extract insights (simplified)
        if "conversion rate" in response_text.lower():
            insights.append(Insight(
                type=InsightType.RECOMMENDATION,
                title="Pipeline Conversion Optimization Opportunity",
                description="Analysis reveals conversion rate optimization potential",
                priority=Priority.HIGH,
                confidence=0.85,
                impact_score=75.0,
                data={"metrics": metrics.dict() if metrics else {}}
            ))

        if "velocity" in response_text.lower() or "slow" in response_text.lower():
            insights.append(Insight(
                type=InsightType.WARNING,
                title="Sales Velocity Requires Attention",
                description="Deal velocity indicates potential process bottlenecks",
                priority=Priority.MEDIUM,
                confidence=0.78,
                impact_score=60.0,
                data={}
            ))

        # Extract recommendations
        recommendations.append(Recommendation(
            title="Implement Lead Scoring System",
            description="Prioritize high-quality leads to improve conversion efficiency",
            priority=Priority.HIGH,
            confidence=0.82,
            expected_impact="15-20% conversion rate improvement",
            effort_level="medium",
            timeline="30-45 days",
            actions=[
                "Define scoring criteria based on historical wins",
                "Integrate scoring into CRM workflow",
                "Train team on prioritization framework"
            ]
        ))

        # Extract summary from response
        summary_start = response_text.find("EXECUTIVE SUMMARY")
        if summary_start != -1:
            summary = response_text[summary_start:summary_start+500].split("\n")[1]
        else:
            summary = "Strategic analysis complete with actionable insights"

        return InsightResponse(
            insights=insights,
            recommendations=recommendations,
            summary=summary,
            confidence=0.82,
            metadata={
                "agent": "strategic_analyst",
                "model": self.model,
                "analysis_depth": "deep"
            }
        )

    async def analyze_conversion_funnel(
        self,
        funnel_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Specialized analysis of conversion funnel"""

        self.add_reasoning_step("Analyzing conversion funnel")
        self.use_tool("funnel_analyzer")

        # Analyze drop-off points and optimization opportunities
        # This would contain sophisticated funnel analysis logic

        return {
            "bottlenecks": [],
            "optimization_opportunities": [],
            "predicted_impact": {}
        }

    async def identify_churn_risks(
        self,
        deals: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Identify deals at risk of being lost"""

        self.add_reasoning_step("Identifying churn risks")
        self.use_tool("churn_risk_analyzer")

        at_risk_deals = []

        for deal in deals:
            # Simplified risk scoring
            risk_score = 0.0

            # No recent activity
            if not deal.get("last_activity_date"):
                risk_score += 0.3

            # Long sales cycle
            if deal.get("days_in_stage", 0) > 45:
                risk_score += 0.3

            # Low engagement
            if deal.get("email_response_rate", 1.0) < 0.3:
                risk_score += 0.2

            if risk_score > 0.5:
                at_risk_deals.append({
                    "deal_id": deal.get("id"),
                    "title": deal.get("title"),
                    "risk_score": risk_score,
                    "risk_factors": []
                })

        return at_risk_deals
