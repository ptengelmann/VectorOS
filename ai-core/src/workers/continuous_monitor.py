"""
Continuous Monitoring Worker - THE CORE OF REVENUE INTELLIGENCE

This worker runs every 30 minutes and:
1. Analyzes ALL active deals automatically
2. Detects anomalies (velocity drops, ghosting, risk signals)
3. Generates insights proactively (without user clicking anything)
4. Sends notifications for critical issues

This is what separates VectorOS from a CRM - it's ALWAYS working.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import sys
import os
from dotenv import load_dotenv
import sentry_sdk

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../..', '.env'))

# Initialize Sentry for error tracking
if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        traces_sample_rate=0.1,
        environment=os.getenv("NODE_ENV", "development"),
    )

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.services.deal_scorer import DealScorer
from src.services.intelligent_insights_generator import IntelligentInsightsGenerator
from anthropic import Anthropic

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ContinuousMonitor:
    """
    Autonomous monitoring engine that runs continuously

    This is the brain that makes VectorOS "intelligent":
    - Monitors all deals every 30 minutes
    - Detects patterns and anomalies
    - Generates insights automatically
    - No manual intervention required
    """

    def __init__(self):
        self.deal_scorer = DealScorer()
        self.anthropic_client = Anthropic()
        self.insights_generator = IntelligentInsightsGenerator(self.anthropic_client)

    async def run_monitoring_cycle(self, backend_url: str = "http://localhost:3001") -> Dict[str, Any]:
        """
        Run one complete monitoring cycle

        This is called every 30 minutes by the scheduler
        """
        logger.info("=" * 80)
        logger.info("🤖 STARTING CONTINUOUS MONITORING CYCLE")
        logger.info("=" * 80)

        start_time = datetime.now()
        results = {
            "cycle_start": start_time.isoformat(),
            "workspaces_processed": 0,
            "deals_analyzed": 0,
            "insights_generated": 0,
            "critical_alerts": 0,
            "errors": []
        }

        try:
            # 1. Get all active workspaces
            workspaces = await self._fetch_active_workspaces(backend_url)
            logger.info(f"📊 Found {len(workspaces)} active workspaces")

            # 2. Process each workspace
            for workspace in workspaces:
                try:
                    workspace_results = await self._process_workspace(workspace, backend_url)

                    results["workspaces_processed"] += 1
                    results["deals_analyzed"] += workspace_results["deals_analyzed"]
                    results["insights_generated"] += workspace_results["insights_generated"]
                    results["critical_alerts"] += workspace_results["critical_alerts"]

                except Exception as e:
                    logger.error(f"❌ Error processing workspace {workspace['id']}: {str(e)}")
                    results["errors"].append({
                        "workspace_id": workspace["id"],
                        "error": str(e)
                    })

            # 3. Summary
            duration = (datetime.now() - start_time).total_seconds()
            results["duration_seconds"] = duration

            logger.info("=" * 80)
            logger.info("✅ MONITORING CYCLE COMPLETE")
            logger.info(f"   Workspaces: {results['workspaces_processed']}")
            logger.info(f"   Deals Analyzed: {results['deals_analyzed']}")
            logger.info(f"   Insights Generated: {results['insights_generated']}")
            logger.info(f"   Critical Alerts: {results['critical_alerts']}")
            logger.info(f"   Duration: {duration:.2f}s")
            logger.info("=" * 80)

            return results

        except Exception as e:
            logger.error(f"❌ FATAL ERROR in monitoring cycle: {str(e)}")
            results["errors"].append({"fatal": str(e)})
            return results

    async def _fetch_active_workspaces(self, backend_url: str) -> List[Dict[str, Any]]:
        """
        Get all workspaces that need monitoring

        For now, returns hardcoded workspace - in production would fetch from backend
        """
        # TODO: Fetch from backend API
        # For now, using the known workspace
        return [{
            "id": "9e23b414-f432-4f72-b9bb-0a36dbecd3cc",
            "name": "Pedro's Workspace"
        }]

    async def _process_workspace(
        self,
        workspace: Dict[str, Any],
        backend_url: str
    ) -> Dict[str, Any]:
        """
        Process one workspace - analyze all deals and generate insights
        """
        workspace_id = workspace["id"]
        logger.info(f"\n{'='*60}")
        logger.info(f"🔍 PROCESSING WORKSPACE: {workspace['name']}")
        logger.info(f"{'='*60}")

        results = {
            "deals_analyzed": 0,
            "insights_generated": 0,
            "critical_alerts": 0,
            "anomalies_detected": []
        }

        try:
            # 1. Fetch all active deals
            deals = await self._fetch_workspace_deals(workspace_id, backend_url)
            logger.info(f"📋 Found {len(deals)} active deals")

            if len(deals) == 0:
                logger.info("   No active deals to analyze")
                return results

            # 2. Analyze each deal for anomalies
            high_priority_deals = []

            for deal in deals:
                anomalies = await self._detect_deal_anomalies(deal)

                if anomalies:
                    logger.info(f"   ⚠️  {deal['title']}: {len(anomalies)} anomalies detected")
                    high_priority_deals.append({
                        "deal": deal,
                        "anomalies": anomalies
                    })
                    results["anomalies_detected"].extend(anomalies)

                results["deals_analyzed"] += 1

            # 3. Generate insights for deals with anomalies
            if high_priority_deals:
                logger.info(f"\n🎯 Generating insights for {len(high_priority_deals)} deals with anomalies...")

                for item in high_priority_deals:
                    deal = item["deal"]
                    anomalies = item["anomalies"]

                    insights = await self._generate_insights_for_deal(
                        workspace_id,
                        deal,
                        anomalies,
                        backend_url
                    )

                    results["insights_generated"] += len(insights)

                    # Count critical alerts
                    critical_count = sum(
                        1 for insight in insights
                        if insight.get("priority") == "critical"
                    )
                    results["critical_alerts"] += critical_count

                    if critical_count > 0:
                        logger.info(f"   🚨 {critical_count} CRITICAL alerts for {deal['title']}")

            else:
                logger.info("   ✅ All deals healthy - no anomalies detected")

            return results

        except Exception as e:
            logger.error(f"❌ Error processing workspace {workspace_id}: {str(e)}")
            raise

    async def _fetch_workspace_deals(
        self,
        workspace_id: str,
        backend_url: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch all active deals for a workspace
        """
        import aiohttp

        url = f"{backend_url}/api/v1/workspaces/{workspace_id}/deals"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        result = await response.json()

                        # Handle paginated response
                        if isinstance(result, dict) and "data" in result:
                            data = result["data"]
                            # Handle both { data: { items: [] } } and { data: [] }
                            if isinstance(data, dict) and "items" in data:
                                deals = data["items"]
                            elif isinstance(data, list):
                                deals = data
                            else:
                                deals = []
                        else:
                            deals = result if isinstance(result, list) else []

                        # Filter to active deals only
                        active_deals = [
                            deal for deal in deals
                            if isinstance(deal, dict) and deal.get("stage") not in ["won", "lost"]
                        ]

                        return active_deals
                    else:
                        logger.error(f"Failed to fetch deals: {response.status}")
                        return []

        except Exception as e:
            logger.error(f"Error fetching deals: {str(e)}")
            return []

    async def _detect_deal_anomalies(self, deal: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Detect anomalies in a deal

        This is the intelligence - detecting patterns that indicate risk
        """
        anomalies = []

        # Calculate days since last update
        updated_at = datetime.fromisoformat(deal["updatedAt"].replace("Z", "+00:00"))
        days_inactive = (datetime.now(updated_at.tzinfo) - updated_at).days

        created_at = datetime.fromisoformat(deal["createdAt"].replace("Z", "+00:00"))
        days_old = (datetime.now(created_at.tzinfo) - created_at).days

        # 1. STALE DEAL DETECTION
        if days_inactive > 7:
            severity = "critical" if days_inactive > 14 else "high"
            anomalies.append({
                "type": "stale_deal",
                "severity": severity,
                "metric": "days_inactive",
                "value": days_inactive,
                "threshold": 7,
                "description": f"No activity in {days_inactive} days"
            })

        # 2. STUCK IN STAGE
        stage_duration_thresholds = {
            "lead": 14,
            "qualified": 21,
            "proposal": 30,
            "negotiation": 21
        }

        stage = deal.get("stage", "lead")
        threshold = stage_duration_thresholds.get(stage, 30)

        if days_old > threshold:
            anomalies.append({
                "type": "stuck_in_stage",
                "severity": "high",
                "metric": "stage_duration",
                "value": days_old,
                "threshold": threshold,
                "stage": stage,
                "description": f"Stuck in {stage} for {days_old} days (avg: {threshold})"
            })

        # 3. LOW PROBABILITY FOR STAGE
        probability = deal.get("probability", 0)
        stage_probability_minimums = {
            "lead": 5,
            "qualified": 20,
            "proposal": 40,
            "negotiation": 60
        }

        min_probability = stage_probability_minimums.get(stage, 10)

        if probability < min_probability:
            anomalies.append({
                "type": "low_probability",
                "severity": "medium",
                "metric": "probability",
                "value": probability,
                "threshold": min_probability,
                "stage": stage,
                "description": f"{probability}% probability too low for {stage} stage"
            })

        # 4. HIGH VALUE AT RISK
        value = deal.get("value", 0)
        if value > 10000 and (days_inactive > 5 or probability < 30):
            anomalies.append({
                "type": "high_value_at_risk",
                "severity": "critical",
                "metric": "revenue_at_risk",
                "value": value,
                "description": f"${value:,.0f} deal showing risk signals"
            })

        # 5. CLOSE DATE APPROACHING WITH LOW PROBABILITY
        if deal.get("closeDate"):
            close_date = datetime.fromisoformat(deal["closeDate"].replace("Z", "+00:00"))
            days_until_close = (close_date - datetime.now(close_date.tzinfo)).days

            if 0 < days_until_close < 14 and probability < 70:
                anomalies.append({
                    "type": "close_date_risk",
                    "severity": "high",
                    "metric": "days_until_close",
                    "value": days_until_close,
                    "probability": probability,
                    "description": f"Closes in {days_until_close} days but only {probability}% probable"
                })

        return anomalies

    async def _generate_insights_for_deal(
        self,
        workspace_id: str,
        deal: Dict[str, Any],
        anomalies: List[Dict[str, Any]],
        backend_url: str
    ) -> List[Dict[str, Any]]:
        """
        Generate AI insights for a deal based on detected anomalies
        """
        try:
            # Build enhanced prompt with anomaly context
            prompt = self._build_anomaly_prompt(deal, anomalies)

            # Call Claude
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=3000,
                system=self._get_monitoring_system_prompt(),
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text

            # Parse insights
            insights = self.insights_generator._parse_claude_response(response_text, deal)

            # Save to backend
            if insights:
                await self._save_insights(workspace_id, insights, backend_url)

            return insights

        except Exception as e:
            logger.error(f"Error generating insights for deal {deal['id']}: {str(e)}")
            return []

    def _build_anomaly_prompt(self, deal: Dict[str, Any], anomalies: List[Dict[str, Any]]) -> str:
        """
        Build prompt that emphasizes detected anomalies
        """
        anomaly_summary = "\n".join([
            f"- {a['description']} (severity: {a['severity']})"
            for a in anomalies
        ])

        return f"""# AUTONOMOUS MONITORING ALERT

## Deal Overview
- **Title:** {deal['title']}
- **Value:** ${deal.get('value', 0):,.0f}
- **Stage:** {deal.get('stage')}
- **Probability:** {deal.get('probability', 0)}%
- **Company:** {deal.get('company', 'Unknown')}

## ⚠️ ANOMALIES DETECTED:
{anomaly_summary}

## Your Task
Generate 2-3 HIGH-PRIORITY insights that:
1. Address the most critical anomalies first
2. Provide specific, actionable recovery steps
3. Include timeline expectations ("Within 2 days", etc.)
4. Focus on preventing deal loss

Remember: This deal was flagged automatically by our monitoring system. These insights will be sent to the sales rep IMMEDIATELY.
"""

    def _get_monitoring_system_prompt(self) -> str:
        """
        System prompt optimized for autonomous monitoring
        """
        return """You are VectorOS Autonomous Monitoring AI - a proactive revenue intelligence system.

Your role:
- Analyze deals that have been automatically flagged by anomaly detection
- Generate CRITICAL, ACTIONABLE insights that prevent deal loss
- Focus on specific recovery actions, not generic advice
- Be direct and urgent when deals are at risk

Output format - JSON array of insights:
[
  {
    "type": "risk" | "warning" | "opportunity",
    "title": "Brief, urgent title",
    "description": "Specific explanation with data",
    "priority": "critical" | "high",
    "confidence": 0.75-0.95,
    "data": {
      "deal_id": "...",
      "deal_title": "...",
      "deal_value": 8000,
      "key_metrics": {...}
    },
    "actions": [
      {
        "action": "Specific action to take",
        "priority": "critical",
        "timeline": "Within 24-48 hours",
        "expected_impact": "What this will accomplish"
      }
    ]
  }
]

Guidelines:
- Maximum 3 insights per deal (focus on critical issues)
- Every insight must have 2-4 specific actions
- Use data from anomalies to support recommendations
- Be honest about risk level
"""

    async def _save_insights(
        self,
        workspace_id: str,
        insights: List[Dict[str, Any]],
        backend_url: str
    ) -> bool:
        """
        Save generated insights to backend
        """
        import aiohttp

        url = f"{backend_url}/api/v1/workspaces/{workspace_id}/insights/batch"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json={"insights": insights}) as response:
                    if response.status == 201:
                        logger.info(f"   ✅ Saved {len(insights)} insights to database")
                        return True
                    else:
                        logger.error(f"   ❌ Failed to save insights: {response.status}")
                        return False

        except Exception as e:
            logger.error(f"   ❌ Error saving insights: {str(e)}")
            return False


async def main():
    """
    Main entry point for continuous monitoring worker

    Runs continuously with 30-minute intervals between cycles
    """
    logger.info("🚀 VectorOS Continuous Monitoring Worker Starting...")
    logger.info("📅 Schedule: Running every 30 minutes")

    # Get backend URL from environment
    backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
    logger.info(f"🔗 Backend URL: {backend_url}")

    monitor = ContinuousMonitor()

    cycle_count = 0

    # Run continuously
    while True:
        cycle_count += 1
        logger.info(f"\n{'='*80}")
        logger.info(f"🔄 STARTING CYCLE #{cycle_count}")
        logger.info(f"{'='*80}")

        try:
            # Run monitoring cycle
            results = await monitor.run_monitoring_cycle(backend_url)

            # Log results
            if results["errors"]:
                logger.warning(f"⚠️  Cycle #{cycle_count} completed with errors")
            else:
                logger.info(f"✅ Cycle #{cycle_count} completed successfully")

        except Exception as e:
            logger.error(f"❌ Fatal error in cycle #{cycle_count}: {str(e)}")
            # Don't exit - keep running

        # Wait 30 minutes before next cycle
        logger.info(f"\n💤 Sleeping for 30 minutes until next cycle...")
        logger.info(f"   Next cycle will start at: {(datetime.now() + timedelta(minutes=30)).strftime('%Y-%m-%d %H:%M:%S')}")

        await asyncio.sleep(30 * 60)  # 30 minutes in seconds


if __name__ == "__main__":
    asyncio.run(main())
