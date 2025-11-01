"""
VectorOS Deal Scoring Service

Calculates automated health scores for deals based on:
- Deal value and probability
- Stage progression velocity
- Time in current stage
- Days until close date
- Contact engagement level
- Data completeness
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import json

from ..utils.logger import get_logger

logger = get_logger(__name__)


class DealScorer:
    """
    Automated deal health scoring system
    """

    def __init__(self):
        self.weights = {
            'probability': 0.25,      # Win probability (0-100)
            'velocity': 0.20,         # Speed through pipeline
            'freshness': 0.15,        # Recent activity
            'completeness': 0.15,     # Data quality
            'urgency': 0.15,          # Close date proximity
            'value_score': 0.10,      # Relative deal size
        }

    def score_deal(self, deal: Dict[str, Any], workspace_deals: Optional[list] = None) -> Dict[str, Any]:
        """
        Calculate comprehensive health score for a deal

        Args:
            deal: Deal dictionary with all deal data
            workspace_deals: List of all deals in workspace (for relative scoring)

        Returns:
            Dict with health_score (0-100), health_status, and breakdown
        """
        logger.info(f"Scoring deal: {deal.get('id')} - {deal.get('title')}")

        try:
            # Calculate individual component scores
            probability_score = self._score_probability(deal)
            velocity_score = self._score_velocity(deal)
            freshness_score = self._score_freshness(deal)
            completeness_score = self._score_completeness(deal)
            urgency_score = self._score_urgency(deal)
            value_score = self._score_value(deal, workspace_deals)

            # Calculate weighted health score
            health_score = (
                probability_score * self.weights['probability'] +
                velocity_score * self.weights['velocity'] +
                freshness_score * self.weights['freshness'] +
                completeness_score * self.weights['completeness'] +
                urgency_score * self.weights['urgency'] +
                value_score * self.weights['value_score']
            )

            # Determine health status
            health_status = self._get_health_status(health_score)

            # Build detailed breakdown
            breakdown = {
                'health_score': round(health_score, 1),
                'health_status': health_status,
                'components': {
                    'probability': round(probability_score, 1),
                    'velocity': round(velocity_score, 1),
                    'freshness': round(freshness_score, 1),
                    'completeness': round(completeness_score, 1),
                    'urgency': round(urgency_score, 1),
                    'value_score': round(value_score, 1),
                },
                'insights': self._generate_insights(deal, {
                    'probability': probability_score,
                    'velocity': velocity_score,
                    'freshness': freshness_score,
                    'completeness': completeness_score,
                    'urgency': urgency_score,
                    'value_score': value_score,
                }),
            }

            logger.info(f"Deal {deal.get('id')} scored: {health_score:.1f}/100 ({health_status})")
            return breakdown

        except Exception as e:
            logger.error(f"Error scoring deal {deal.get('id')}: {str(e)}", exc_info=True)
            raise

    def _score_probability(self, deal: Dict[str, Any]) -> float:
        """
        Score based on win probability
        0-100% probability -> 0-100 score
        """
        probability = deal.get('probability', 0) or 0
        return min(100, max(0, probability))

    def _score_velocity(self, deal: Dict[str, Any]) -> float:
        """
        Score based on pipeline velocity (days in current stage)

        Scoring:
        - < 7 days: 100 (very active)
        - 7-14 days: 80 (healthy)
        - 14-30 days: 60 (slowing)
        - 30-60 days: 40 (stalled)
        - > 60 days: 20 (at risk)
        """
        try:
            updated_at = deal.get('updatedAt')
            if not updated_at:
                return 50  # Unknown = medium score

            # Parse updated date
            if isinstance(updated_at, str):
                # Try ISO format first
                try:
                    last_updated = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                except:
                    # Try other common formats
                    last_updated = datetime.strptime(updated_at, '%Y-%m-%d %H:%M:%S')
            else:
                last_updated = updated_at

            # Calculate days since last activity
            days_idle = (datetime.now(last_updated.tzinfo) - last_updated).days

            if days_idle < 7:
                return 100
            elif days_idle < 14:
                return 80
            elif days_idle < 30:
                return 60
            elif days_idle < 60:
                return 40
            else:
                return 20

        except Exception as e:
            logger.warning(f"Error calculating velocity score: {str(e)}")
            return 50  # Default to medium if error

    def _score_freshness(self, deal: Dict[str, Any]) -> float:
        """
        Score based on overall deal freshness (time since creation)

        Scoring:
        - < 30 days: 100 (new)
        - 30-60 days: 90 (active)
        - 60-90 days: 70 (aging)
        - 90-180 days: 50 (old)
        - > 180 days: 30 (very old)
        """
        try:
            created_at = deal.get('createdAt')
            if not created_at:
                return 50

            # Parse created date
            if isinstance(created_at, str):
                try:
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                except:
                    created_date = datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S')
            else:
                created_date = created_at

            days_old = (datetime.now(created_date.tzinfo) - created_date).days

            if days_old < 30:
                return 100
            elif days_old < 60:
                return 90
            elif days_old < 90:
                return 70
            elif days_old < 180:
                return 50
            else:
                return 30

        except Exception as e:
            logger.warning(f"Error calculating freshness score: {str(e)}")
            return 50

    def _score_completeness(self, deal: Dict[str, Any]) -> float:
        """
        Score based on data completeness

        Fields to check:
        - title (required)
        - value (important)
        - stage (important)
        - probability (important)
        - closeDate (important)
        - company (useful)
        - contactName (useful)
        - contactEmail (useful)
        """
        required_fields = ['title', 'value', 'stage', 'probability', 'closeDate']
        useful_fields = ['company', 'contactName', 'contactEmail']

        required_score = sum(
            20 for field in required_fields
            if deal.get(field) is not None and str(deal.get(field)).strip()
        )

        useful_score = sum(
            10 for field in useful_fields
            if deal.get(field) is not None and str(deal.get(field)).strip()
        )

        # Max score: 5 * 20 + 3 * 10 = 130, normalize to 100
        total_score = required_score + useful_score
        return min(100, (total_score / 130) * 100)

    def _score_urgency(self, deal: Dict[str, Any]) -> float:
        """
        Score based on close date proximity

        Scoring:
        - Past due: 30 (needs attention)
        - < 7 days: 100 (very urgent)
        - 7-30 days: 90 (urgent)
        - 30-60 days: 70 (upcoming)
        - 60-90 days: 50 (future)
        - > 90 days: 40 (distant)
        - No date: 30 (needs date)
        """
        try:
            close_date = deal.get('closeDate')
            if not close_date:
                return 30  # No close date set

            # Parse close date
            if isinstance(close_date, str):
                try:
                    target_date = datetime.fromisoformat(close_date.replace('Z', '+00:00'))
                except:
                    target_date = datetime.strptime(close_date, '%Y-%m-%d')
            else:
                target_date = close_date

            # Calculate days until close
            today = datetime.now(target_date.tzinfo) if target_date.tzinfo else datetime.now()
            days_until = (target_date - today).days

            if days_until < 0:
                return 30  # Past due
            elif days_until < 7:
                return 100
            elif days_until < 30:
                return 90
            elif days_until < 60:
                return 70
            elif days_until < 90:
                return 50
            else:
                return 40

        except Exception as e:
            logger.warning(f"Error calculating urgency score: {str(e)}")
            return 30

    def _score_value(self, deal: Dict[str, Any], workspace_deals: Optional[list] = None) -> float:
        """
        Score based on deal value relative to workspace average

        Scoring:
        - > 2x average: 100 (huge)
        - 1.5-2x average: 90 (large)
        - 0.8-1.5x average: 70 (typical)
        - 0.5-0.8x average: 50 (small)
        - < 0.5x average: 30 (very small)
        - No workspace data: 50 (unknown)
        """
        deal_value = deal.get('value', 0) or 0

        if not workspace_deals or len(workspace_deals) == 0:
            return 50  # Can't compare without context

        # Calculate average deal value
        total_value = sum(d.get('value', 0) or 0 for d in workspace_deals)
        avg_value = total_value / len(workspace_deals) if total_value > 0 else 0

        if avg_value == 0:
            return 50

        # Calculate ratio
        ratio = deal_value / avg_value

        if ratio >= 2.0:
            return 100
        elif ratio >= 1.5:
            return 90
        elif ratio >= 0.8:
            return 70
        elif ratio >= 0.5:
            return 50
        else:
            return 30

    def _get_health_status(self, score: float) -> str:
        """
        Convert numeric score to status label

        Ranges:
        - 80-100: excellent
        - 60-79: good
        - 40-59: fair
        - 20-39: poor
        - 0-19: critical
        """
        if score >= 80:
            return 'excellent'
        elif score >= 60:
            return 'good'
        elif score >= 40:
            return 'fair'
        elif score >= 20:
            return 'poor'
        else:
            return 'critical'

    def _generate_insights(self, deal: Dict[str, Any], scores: Dict[str, float]) -> list:
        """
        Generate human-readable insights about score components
        """
        insights = []

        # Probability insights
        if scores['probability'] < 40:
            insights.append(f"Low win probability ({deal.get('probability', 0)}%) - consider qualification")
        elif scores['probability'] >= 80:
            insights.append(f"High win probability ({deal.get('probability', 0)}%) - prioritize closing")

        # Velocity insights
        if scores['velocity'] < 40:
            insights.append("Deal has been idle for a while - needs immediate attention")
        elif scores['velocity'] >= 90:
            insights.append("Deal is very active - maintain momentum")

        # Completeness insights
        if scores['completeness'] < 60:
            insights.append("Missing critical deal information - complete profile")

        # Urgency insights
        if scores['urgency'] >= 90:
            insights.append("Close date approaching soon - act urgently")
        elif scores['urgency'] < 40:
            close_date = deal.get('closeDate')
            if not close_date:
                insights.append("No close date set - schedule target close date")
            else:
                insights.append("Close date is far out or past due - reassess timeline")

        # Value insights
        if scores['value_score'] >= 90:
            insights.append("High-value deal - allocate senior resources")
        elif scores['value_score'] < 40:
            insights.append("Small deal value - consider efficiency")

        return insights

    def score_workspace(self, deals: list) -> Dict[str, Any]:
        """
        Score all deals in a workspace and return aggregate metrics

        Args:
            deals: List of deal dictionaries

        Returns:
            Dict with individual scores and workspace-level metrics
        """
        logger.info(f"Scoring {len(deals)} deals in workspace")

        scored_deals = []
        for deal in deals:
            try:
                score = self.score_deal(deal, deals)
                scored_deals.append({
                    'deal_id': deal.get('id'),
                    'title': deal.get('title'),
                    **score
                })
            except Exception as e:
                logger.error(f"Failed to score deal {deal.get('id')}: {str(e)}")
                continue

        # Calculate workspace metrics
        if scored_deals:
            avg_health = sum(d['health_score'] for d in scored_deals) / len(scored_deals)
            health_distribution = {
                'excellent': sum(1 for d in scored_deals if d['health_status'] == 'excellent'),
                'good': sum(1 for d in scored_deals if d['health_status'] == 'good'),
                'fair': sum(1 for d in scored_deals if d['health_status'] == 'fair'),
                'poor': sum(1 for d in scored_deals if d['health_status'] == 'poor'),
                'critical': sum(1 for d in scored_deals if d['health_status'] == 'critical'),
            }
        else:
            avg_health = 0
            health_distribution = {}

        return {
            'scored_deals': scored_deals,
            'workspace_metrics': {
                'average_health': round(avg_health, 1),
                'total_deals': len(deals),
                'scored_deals': len(scored_deals),
                'health_distribution': health_distribution,
            }
        }
