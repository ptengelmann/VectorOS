"""
VectorOS Deal Monitoring Worker
Runs periodically to analyze deals and generate alerts
"""

import os
import asyncio
import aiohttp
import logging
from typing import List, Dict, Optional
from datetime import datetime

from ..services.anomaly_detector import get_anomaly_detector
from ..services.ml_deal_scorer import get_ml_deal_scorer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DealMonitor:
    """Autonomous deal monitoring worker"""

    def __init__(self, backend_url: str = None):
        self.backend_url = backend_url or os.getenv('BACKEND_URL', 'http://localhost:3001')
        self.anomaly_detector = get_anomaly_detector()
        self.ml_scorer = get_ml_deal_scorer()
        logger.info(f"Deal Monitor initialized with backend: {self.backend_url}")

    async def fetch_active_deals(self, workspace_id: str) -> List[Dict]:
        """
        Fetch all active deals from backend API

        Args:
            workspace_id: Workspace ID to fetch deals for

        Returns:
            List of active deals with activities
        """
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.backend_url}/api/deals"
                params = {'workspaceId': workspace_id}

                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        deals = data.get('deals', [])

                        # Filter active deals only (not won/lost)
                        active_deals = [
                            d for d in deals
                            if d.get('outcome') not in ['won', 'lost']
                        ]

                        logger.info(f"Fetched {len(active_deals)} active deals for workspace {workspace_id}")
                        return active_deals
                    else:
                        logger.error(f"Failed to fetch deals: {response.status}")
                        return []

        except Exception as e:
            logger.error(f"Error fetching deals: {e}")
            return []

    async def create_insight(self, workspace_id: str, deal_id: str, anomaly: Dict) -> bool:
        """
        Create an insight (alert) in the backend

        Args:
            workspace_id: Workspace ID
            deal_id: Deal ID the alert is for
            anomaly: Anomaly data from detector

        Returns:
            True if insight created successfully
        """
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.backend_url}/api/insights"

                # Map anomaly to insight structure
                insight_data = {
                    'workspaceId': workspace_id,
                    'dealId': deal_id,
                    'type': anomaly['type'],
                    'title': anomaly['title'],
                    'description': anomaly['description'],
                    'priority': anomaly['priority'],
                    'confidence': anomaly['confidence'],
                    'data': anomaly.get('data', {}),
                    'actions': anomaly.get('actions', []),
                    'status': 'new'
                }

                async with session.post(url, json=insight_data) as response:
                    if response.status in [200, 201]:
                        logger.info(f"Created insight for deal {deal_id}: {anomaly['title']}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to create insight: {response.status} - {error_text}")
                        return False

        except Exception as e:
            logger.error(f"Error creating insight: {e}")
            return False

    async def monitor_workspace(self, workspace_id: str) -> Dict:
        """
        Monitor all deals in a workspace and generate alerts

        Args:
            workspace_id: Workspace ID to monitor

        Returns:
            Monitoring summary stats
        """
        logger.info(f"Starting monitoring for workspace: {workspace_id}")

        # Fetch active deals
        deals = await self.fetch_active_deals(workspace_id)

        if not deals:
            logger.info(f"No active deals to monitor for workspace {workspace_id}")
            return {
                'workspace_id': workspace_id,
                'deals_monitored': 0,
                'anomalies_detected': 0,
                'insights_created': 0
            }

        # Score deals with ML model
        logger.info(f"Scoring {len(deals)} deals with ML model...")
        ml_scores = {}
        try:
            for deal in deals:
                try:
                    score = self.ml_scorer.score_deal(deal)
                    ml_scores[deal['id']] = score
                except Exception as e:
                    logger.warning(f"Failed to score deal {deal['id']}: {e}")
                    continue
        except Exception as e:
            logger.error(f"Error during ML scoring: {e}")

        # Detect anomalies
        logger.info("Detecting anomalies...")
        anomalies = self.anomaly_detector.analyze_workspace_deals(deals, ml_scores)

        logger.info(f"Detected {len(anomalies)} anomalies")

        # Create insights for each anomaly
        insights_created = 0
        for anomaly in anomalies:
            deal_id = anomaly['deal_id']
            success = await self.create_insight(workspace_id, deal_id, anomaly)
            if success:
                insights_created += 1

        summary = {
            'workspace_id': workspace_id,
            'deals_monitored': len(deals),
            'anomalies_detected': len(anomalies),
            'insights_created': insights_created,
            'timestamp': datetime.utcnow().isoformat()
        }

        logger.info(f"Monitoring complete: {summary}")
        return summary

    async def monitor_all_workspaces(self) -> List[Dict]:
        """
        Monitor all active workspaces

        Returns:
            List of monitoring summaries for each workspace
        """
        # TODO: Fetch list of active workspaces from backend
        # For now, this would need to be configured or fetched from API

        logger.warning("monitor_all_workspaces not fully implemented - needs workspace list")
        return []

    async def run_once(self, workspace_id: str = None) -> Dict:
        """
        Run monitoring cycle once

        Args:
            workspace_id: Optional specific workspace ID to monitor

        Returns:
            Monitoring summary
        """
        logger.info("=== Deal Monitor: Starting monitoring cycle ===")
        start_time = datetime.utcnow()

        if workspace_id:
            # Monitor specific workspace
            summary = await self.monitor_workspace(workspace_id)
            summaries = [summary]
        else:
            # Monitor all workspaces
            summaries = await self.monitor_all_workspaces()

        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()

        result = {
            'status': 'completed',
            'duration_seconds': duration,
            'workspaces_monitored': len(summaries),
            'summaries': summaries,
            'timestamp': end_time.isoformat()
        }

        logger.info(f"=== Monitoring cycle complete in {duration:.2f}s ===")
        return result

    async def run_continuous(self, interval_minutes: int = 30, workspace_id: str = None):
        """
        Run monitoring continuously at specified interval

        Args:
            interval_minutes: How often to run (default: 30 minutes)
            workspace_id: Optional specific workspace to monitor
        """
        logger.info(f"Starting continuous monitoring (interval: {interval_minutes} minutes)")

        while True:
            try:
                await self.run_once(workspace_id)
            except Exception as e:
                logger.error(f"Error during monitoring cycle: {e}")

            # Wait for next cycle
            logger.info(f"Sleeping for {interval_minutes} minutes until next cycle...")
            await asyncio.sleep(interval_minutes * 60)


async def main():
    """Main entry point for worker"""
    import sys

    # Get workspace ID from environment or command line
    workspace_id = os.getenv('WORKSPACE_ID')
    if len(sys.argv) > 1:
        workspace_id = sys.argv[1]

    if not workspace_id:
        logger.error("No workspace ID provided. Set WORKSPACE_ID env var or pass as argument.")
        sys.exit(1)

    # Get interval from environment
    interval_minutes = int(os.getenv('MONITOR_INTERVAL_MINUTES', '30'))

    # Create and run monitor
    monitor = DealMonitor()
    await monitor.run_continuous(interval_minutes=interval_minutes, workspace_id=workspace_id)


if __name__ == '__main__':
    asyncio.run(main())
