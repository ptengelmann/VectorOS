"""
Autonomous Agent - The Brain of VectorOS
Proactively monitors deals, makes decisions, and takes actions without human input.

This is Weeks 4-5 of building the AI brain - making it autonomous and proactive.

The agent runs 24/7 in the background:
- Monitors all active deals
- Detects issues and opportunities
- Makes confident decisions
- Takes automated actions
- Learns from outcomes
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


class AutonomousAgent:
    """
    Autonomous AI agent that proactively manages business operations.

    This agent:
    1. Monitors active deals 24/7
    2. Detects at-risk deals and opportunities
    3. Makes decisions based on confidence thresholds
    4. Takes automated actions (alerts, updates, recommendations)
    5. Learns from outcomes to improve
    """

    def __init__(
        self,
        db_client,
        deal_analyzer,
        memory_service,
        outcome_tracker,
        cache_service
    ):
        """
        Initialize autonomous agent with all services.

        Args:
            db_client: Database client (Prisma)
            deal_analyzer: AI deal analyzer service
            memory_service: Vector memory service
            outcome_tracker: Outcome tracking service
            cache_service: Redis cache service
        """
        self.db = db_client
        self.analyzer = deal_analyzer
        self.memory = memory_service
        self.tracker = outcome_tracker
        self.cache = cache_service

        # Agent configuration
        self.config = {
            "enabled": False,
            "check_interval_minutes": 30,  # How often to check deals
            "high_confidence_threshold": 0.85,  # 85%+ = take action
            "medium_confidence_threshold": 0.70,  # 70%+ = create recommendation
            "at_risk_threshold": 0.30,  # < 30% win probability = at risk
            "stale_days": 7,  # Days without update = stale
        }

        # Scheduler for background jobs
        self.scheduler = AsyncIOScheduler()
        self.is_running = False

        logger.info("Autonomous agent initialized (disabled by default)")

    def start(self, interval_minutes: int = 30):
        """
        Start the autonomous agent.

        Args:
            interval_minutes: How often to run monitoring cycle
        """
        if self.is_running:
            logger.warning("Agent already running")
            return

        self.config["check_interval_minutes"] = interval_minutes
        self.config["enabled"] = True

        # Schedule monitoring job
        self.scheduler.add_job(
            self._monitoring_cycle,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id="deal_monitoring",
            name="Autonomous Deal Monitoring",
            replace_existing=True
        )

        self.scheduler.start()
        self.is_running = True

        logger.info(f"🤖 Autonomous agent STARTED - checking every {interval_minutes} minutes")

    def stop(self):
        """Stop the autonomous agent."""
        if not self.is_running:
            logger.warning("Agent not running")
            return

        self.scheduler.shutdown(wait=False)
        self.is_running = False
        self.config["enabled"] = False

        logger.info("🛑 Autonomous agent STOPPED")

    async def _monitoring_cycle(self):
        """
        Main monitoring cycle - runs periodically.

        This is the autonomous brain loop:
        1. Find all active deals
        2. Analyze each deal
        3. Detect issues/opportunities
        4. Make decisions
        5. Take actions
        """
        logger.info("🧠 Starting autonomous monitoring cycle...")

        try:
            # Get all active workspaces
            workspaces = await self.db.workspace.findMany({
                "where": {"deals": {"some": {}}}  # Has at least one deal
            })

            total_actions = 0

            for workspace in workspaces:
                actions = await self._monitor_workspace(workspace.id)
                total_actions += actions

            logger.info(f"✅ Monitoring cycle complete - took {total_actions} actions")

        except Exception as e:
            logger.error(f"❌ Monitoring cycle error: {e}")

    async def _monitor_workspace(self, workspace_id: str) -> int:
        """
        Monitor all deals in a workspace.

        Args:
            workspace_id: Workspace to monitor

        Returns:
            Number of actions taken
        """
        try:
            # Get all active deals (not won/lost)
            active_deals = await self.db.deal.findMany({
                "where": {
                    "workspaceId": workspace_id,
                    "stage": {
                        "not_in": ["won", "lost"]
                    }
                }
            })

            logger.info(f"Monitoring {len(active_deals)} active deals in workspace {workspace_id}")

            actions_taken = 0

            for deal in active_deals:
                # Check each deal
                deal_actions = await self._check_deal(deal, workspace_id)
                actions_taken += deal_actions

            return actions_taken

        except Exception as e:
            logger.error(f"Workspace monitoring error: {e}")
            return 0

    async def _check_deal(self, deal: Any, workspace_id: str) -> int:
        """
        Check a single deal for issues and opportunities.

        Args:
            deal: Deal to check
            workspace_id: Workspace context

        Returns:
            Number of actions taken
        """
        actions = 0

        try:
            # Convert deal to dict
            deal_dict = {
                "id": deal.id,
                "title": deal.title,
                "value": deal.value,
                "stage": deal.stage,
                "probability": deal.probability,
                "company": deal.company,
                "contactName": deal.contactName,
                "contactEmail": deal.contactEmail,
                "closeDate": deal.closeDate.isoformat() if deal.closeDate else None,
                "createdAt": deal.createdAt.isoformat(),
                "updatedAt": deal.updatedAt.isoformat(),
            }

            # Run checks
            actions += await self._check_stale_deal(deal_dict, workspace_id)
            actions += await self._check_at_risk(deal_dict, workspace_id)
            actions += await self._check_opportunity(deal_dict, workspace_id)
            actions += await self._check_closing_soon(deal_dict, workspace_id)

        except Exception as e:
            logger.error(f"Deal check error for {deal.id}: {e}")

        return actions

    async def _check_stale_deal(self, deal: Dict, workspace_id: str) -> int:
        """Check if deal has gone stale (no recent activity)."""
        try:
            updated_at = datetime.fromisoformat(deal["updatedAt"].replace('Z', '+00:00'))
            days_since_update = (datetime.now(updated_at.tzinfo) - updated_at).days

            if days_since_update >= self.config["stale_days"]:
                # Deal is stale - create alert
                await self._create_insight(
                    workspace_id=workspace_id,
                    insight_type="warning",
                    title=f"Stale Deal: {deal['title']}",
                    description=f"No activity for {days_since_update} days. Risk of losing momentum.",
                    priority="high",
                    confidence=0.95,  # High confidence this is an issue
                    data={"deal_id": deal["id"], "days_stale": days_since_update},
                    actions=[
                        "Schedule follow-up call with contact",
                        "Send re-engagement email",
                        "Review if deal is still viable"
                    ]
                )

                logger.info(f"🚨 Created stale deal alert for {deal['title']}")
                return 1

        except Exception as e:
            logger.error(f"Stale check error: {e}")

        return 0

    async def _check_at_risk(self, deal: Dict, workspace_id: str) -> int:
        """Check if deal is at risk of being lost."""
        try:
            probability = (deal.get("probability") or 50) / 100.0

            if probability < self.config["at_risk_threshold"]:
                # Deal is at risk - high priority
                await self._create_insight(
                    workspace_id=workspace_id,
                    insight_type="warning",
                    title=f"At-Risk Deal: {deal['title']}",
                    description=f"Win probability is low ({probability*100:.0f}%). Immediate action needed.",
                    priority="critical",
                    confidence=0.88,
                    data={"deal_id": deal["id"], "win_probability": probability},
                    actions=[
                        "Identify and address blockers",
                        "Escalate to senior sales rep",
                        "Consider offering incentives",
                        "Re-evaluate deal qualification"
                    ]
                )

                logger.info(f"🔴 Created at-risk alert for {deal['title']}")
                return 1

        except Exception as e:
            logger.error(f"At-risk check error: {e}")

        return 0

    async def _check_opportunity(self, deal: Dict, workspace_id: str) -> int:
        """Check for upsell/cross-sell opportunities."""
        try:
            # High value + high probability = opportunity
            value = deal.get("value") or 0
            probability = (deal.get("probability") or 50) / 100.0

            if value > 50000 and probability > 0.75:
                # Great opportunity for upsell
                await self._create_insight(
                    workspace_id=workspace_id,
                    insight_type="recommendation",
                    title=f"Upsell Opportunity: {deal['title']}",
                    description=f"High-value deal (${value:,.0f}) with strong win probability ({probability*100:.0f}%).",
                    priority="medium",
                    confidence=0.82,
                    data={"deal_id": deal["id"], "value": value, "probability": probability},
                    actions=[
                        "Present premium package options",
                        "Introduce additional products/services",
                        "Discuss multi-year contracts",
                        "Offer bundled pricing"
                    ]
                )

                logger.info(f"💰 Created upsell opportunity for {deal['title']}")
                return 1

        except Exception as e:
            logger.error(f"Opportunity check error: {e}")

        return 0

    async def _check_closing_soon(self, deal: Dict, workspace_id: str) -> int:
        """Check if deal is closing soon and needs attention."""
        try:
            if not deal.get("closeDate"):
                return 0

            close_date = datetime.fromisoformat(deal["closeDate"].replace('Z', '+00:00'))
            days_to_close = (close_date - datetime.now(close_date.tzinfo)).days

            # Closing within 7 days
            if 0 < days_to_close <= 7:
                await self._create_insight(
                    workspace_id=workspace_id,
                    insight_type="recommendation",
                    title=f"Closing Soon: {deal['title']}",
                    description=f"Deal closes in {days_to_close} days. Ensure all steps are complete.",
                    priority="high",
                    confidence=1.0,  # This is a fact
                    data={"deal_id": deal["id"], "days_to_close": days_to_close},
                    actions=[
                        "Verify all contract terms",
                        "Confirm decision makers are aligned",
                        "Prepare closing documents",
                        "Schedule final sign-off meeting"
                    ]
                )

                logger.info(f"⏰ Created closing soon reminder for {deal['title']}")
                return 1

        except Exception as e:
            logger.error(f"Closing check error: {e}")

        return 0

    async def _create_insight(
        self,
        workspace_id: str,
        insight_type: str,
        title: str,
        description: str,
        priority: str,
        confidence: float,
        data: Dict,
        actions: List[str]
    ):
        """
        Create an AI-generated insight.

        Args:
            workspace_id: Workspace to create insight for
            insight_type: Type of insight (warning, recommendation, prediction)
            title: Insight title
            description: Detailed description
            priority: Priority level (low, medium, high, critical)
            confidence: AI confidence (0.0-1.0)
            data: Supporting data
            actions: List of suggested actions
        """
        try:
            await self.db.insight.create({
                "data": {
                    "workspaceId": workspace_id,
                    "type": insight_type,
                    "title": title,
                    "description": description,
                    "priority": priority,
                    "confidence": confidence,
                    "data": data,
                    "actions": {"actions": actions},  # Wrap in object for JSON
                    "status": "new"
                }
            })

        except Exception as e:
            logger.error(f"Failed to create insight: {e}")

    def get_status(self) -> Dict[str, Any]:
        """
        Get agent status and statistics.

        Returns:
            Agent status information
        """
        return {
            "enabled": self.config["enabled"],
            "is_running": self.is_running,
            "check_interval_minutes": self.config["check_interval_minutes"],
            "configuration": {
                "high_confidence_threshold": self.config["high_confidence_threshold"],
                "medium_confidence_threshold": self.config["medium_confidence_threshold"],
                "at_risk_threshold": self.config["at_risk_threshold"],
                "stale_days": self.config["stale_days"],
            },
            "next_run": self.scheduler.get_job("deal_monitoring").next_run_time.isoformat()
            if self.is_running and self.scheduler.get_job("deal_monitoring")
            else None
        }

    def update_config(self, config_updates: Dict[str, Any]):
        """
        Update agent configuration.

        Args:
            config_updates: Configuration updates to apply
        """
        for key, value in config_updates.items():
            if key in self.config:
                self.config[key] = value
                logger.info(f"Updated agent config: {key} = {value}")


# Singleton instance
_autonomous_agent: Optional[AutonomousAgent] = None


def get_autonomous_agent(
    db_client=None,
    deal_analyzer=None,
    memory_service=None,
    outcome_tracker=None,
    cache_service=None
) -> Optional[AutonomousAgent]:
    """Get or create the autonomous agent singleton."""
    global _autonomous_agent

    if _autonomous_agent is None and all([db_client, deal_analyzer, memory_service, outcome_tracker, cache_service]):
        _autonomous_agent = AutonomousAgent(
            db_client,
            deal_analyzer,
            memory_service,
            outcome_tracker,
            cache_service
        )

    return _autonomous_agent
