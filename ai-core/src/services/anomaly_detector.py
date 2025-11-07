"""
VectorOS Anomaly Detection Service
Detects deal health issues and generates alerts
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """Detect anomalies and health issues in deals"""

    def __init__(self):
        # Thresholds for anomaly detection
        self.STALE_DAYS_THRESHOLD = 14  # No activity in 14 days
        self.STAGE_STAGNATION_DAYS = 30  # Stuck in stage for 30 days
        self.PROBABILITY_DROP_THRESHOLD = 20  # 20% drop in probability
        self.CLOSE_DATE_SLIP_DAYS = 7  # Close date moved back 7+ days
        self.LOW_WIN_PROBABILITY = 0.25  # Below 25% win probability
        self.HIGH_VALUE_THRESHOLD = 50000  # High-value deals for priority

    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse ISO format timestamp string to datetime with timezone"""
        if timestamp_str.endswith('Z'):
            timestamp_str = timestamp_str.replace('Z', '+00:00')
        return datetime.fromisoformat(timestamp_str)

    def detect_stale_deal(self, deal: Dict) -> Optional[Dict]:
        """
        Detect deals with no recent activity

        Returns alert dict if anomaly detected, None otherwise
        """
        activities = deal.get('activities', [])

        if not activities:
            # No activities at all
            days_since_created = (datetime.utcnow().replace(tzinfo=timezone.utc) -
                                  self._parse_timestamp(deal['createdAt'])).days

            if days_since_created >= self.STALE_DAYS_THRESHOLD:
                return {
                    'type': 'warning',
                    'category': 'stale_deal',
                    'title': 'Deal Has No Activity',
                    'description': f'This deal has been idle for {days_since_created} days with no recorded activities.',
                    'priority': 'high',
                    'confidence': 1.0,
                    'data': {
                        'days_idle': days_since_created,
                        'activity_count': 0
                    },
                    'actions': [
                        'Schedule a follow-up call',
                        'Send engagement email',
                        'Review deal status with team'
                    ]
                }
        else:
            # Find most recent activity
            most_recent = max(activities, key=lambda a: a['createdAt'])
            days_since_activity = (datetime.utcnow().replace(tzinfo=timezone.utc) -
                                   self._parse_timestamp(most_recent['createdAt'])).days

            if days_since_activity >= self.STALE_DAYS_THRESHOLD:
                return {
                    'type': 'warning',
                    'category': 'stale_deal',
                    'title': 'No Recent Activity',
                    'description': f'Last activity was {days_since_activity} days ago. Deal may be losing momentum.',
                    'priority': 'high',
                    'confidence': 0.9,
                    'data': {
                        'days_since_last_activity': days_since_activity,
                        'last_activity_type': most_recent['type'],
                        'activity_count': len(activities)
                    },
                    'actions': [
                        'Reach out to prospect immediately',
                        'Send value proposition reminder',
                        'Schedule discovery call'
                    ]
                }

        return None

    def detect_stage_stagnation(self, deal: Dict) -> Optional[Dict]:
        """
        Detect deals stuck in the same stage for too long

        Returns alert dict if anomaly detected, None otherwise
        """
        days_in_stage = (datetime.utcnow().replace(tzinfo=timezone.utc) -
                         self._parse_timestamp(deal['updatedAt'])).days

        if days_in_stage >= self.STAGE_STAGNATION_DAYS:
            stage = deal.get('stage', 'unknown')
            priority = 'critical' if days_in_stage > 60 else 'high'

            return {
                'type': 'warning',
                'category': 'stage_stagnation',
                'title': f'Deal Stuck in {stage.title()} Stage',
                'description': f'This deal has been in {stage} stage for {days_in_stage} days without progression.',
                'priority': priority,
                'confidence': 0.85,
                'data': {
                    'days_in_stage': days_in_stage,
                    'current_stage': stage
                },
                'actions': [
                    'Identify blockers to progression',
                    'Schedule stakeholder alignment call',
                    'Review and update deal strategy'
                ]
            }

        return None

    def detect_low_win_probability(self, deal: Dict, ml_score: Optional[Dict] = None) -> Optional[Dict]:
        """
        Detect deals with critically low win probability

        Args:
            deal: Deal data
            ml_score: Optional ML scoring result with win_probability

        Returns alert dict if anomaly detected, None otherwise
        """
        # Use ML score if available, otherwise fall back to manual probability
        if ml_score and 'win_probability' in ml_score:
            win_probability = ml_score['win_probability']
            risk_level = ml_score.get('risk_level', 'unknown')
        else:
            win_probability = deal.get('probability', 50) / 100.0
            if win_probability >= 0.75:
                risk_level = 'low'
            elif win_probability >= 0.50:
                risk_level = 'medium'
            elif win_probability >= 0.25:
                risk_level = 'high'
            else:
                risk_level = 'critical'

        # Only alert on high-risk and critical deals
        if win_probability < self.LOW_WIN_PROBABILITY:
            deal_value = deal.get('value', 0)
            is_high_value = deal_value >= self.HIGH_VALUE_THRESHOLD

            priority = 'critical' if is_high_value else 'high'

            return {
                'type': 'warning',
                'category': 'low_win_probability',
                'title': f'High Risk Deal - {int(win_probability * 100)}% Win Probability',
                'description': f'AI predicts only {int(win_probability * 100)}% chance of winning this deal. Immediate action required.',
                'priority': priority,
                'confidence': 0.92,
                'data': {
                    'win_probability': round(win_probability, 4),
                    'risk_level': risk_level,
                    'deal_value': deal_value,
                    'is_high_value': is_high_value
                },
                'actions': [
                    'Review competitive positioning',
                    'Address objections proactively',
                    'Escalate to senior leadership',
                    'Consider strategic discounting'
                ]
            }

        return None

    def detect_close_date_slip(self, deal: Dict, historical_close_dates: Optional[List[datetime]] = None) -> Optional[Dict]:
        """
        Detect if close date has been pushed back significantly

        Args:
            deal: Current deal data
            historical_close_dates: Optional list of previous close dates

        Returns alert dict if anomaly detected, None otherwise
        """
        current_close_date_str = deal.get('closeDate')

        if not current_close_date_str or not historical_close_dates:
            return None

        current_close_date = self._parse_timestamp(current_close_date_str)

        # Check if close date was moved back
        for historical_date in historical_close_dates:
            days_slipped = (current_close_date - historical_date).days

            if days_slipped >= self.CLOSE_DATE_SLIP_DAYS:
                return {
                    'type': 'warning',
                    'category': 'close_date_slip',
                    'title': 'Close Date Pushed Back',
                    'description': f'Close date moved back by {days_slipped} days. May indicate deal complications.',
                    'priority': 'medium',
                    'confidence': 0.75,
                    'data': {
                        'days_slipped': days_slipped,
                        'previous_close_date': historical_date.isoformat(),
                        'current_close_date': current_close_date.isoformat()
                    },
                    'actions': [
                        'Reassess timeline with prospect',
                        'Identify new blockers',
                        'Update forecast accordingly'
                    ]
                }

        return None

    def detect_overdue_close_date(self, deal: Dict) -> Optional[Dict]:
        """
        Detect deals past their close date

        Returns alert dict if anomaly detected, None otherwise
        """
        close_date_str = deal.get('closeDate')
        outcome = deal.get('outcome')

        # Only check active deals (not won/lost)
        if not close_date_str or outcome in ['won', 'lost']:
            return None

        close_date = self._parse_timestamp(close_date_str)
        now = datetime.utcnow().replace(tzinfo=timezone.utc)

        if now > close_date:
            days_overdue = (now - close_date).days

            return {
                'type': 'warning',
                'category': 'overdue_close_date',
                'title': 'Deal Past Expected Close Date',
                'description': f'This deal is {days_overdue} days past its expected close date of {close_date.strftime("%Y-%m-%d")}.',
                'priority': 'high',
                'confidence': 1.0,
                'data': {
                    'days_overdue': days_overdue,
                    'close_date': close_date.isoformat()
                },
                'actions': [
                    'Update close date to realistic timeframe',
                    'Re-qualify deal status',
                    'Determine if deal is still viable'
                ]
            }

        return None

    def analyze_deal(self, deal: Dict, ml_score: Optional[Dict] = None) -> List[Dict]:
        """
        Run all anomaly detection checks on a deal

        Args:
            deal: Deal data with activities
            ml_score: Optional ML scoring result

        Returns:
            List of detected anomalies/alerts
        """
        anomalies = []

        # Skip if deal is already closed
        if deal.get('outcome') in ['won', 'lost']:
            return anomalies

        # Run all detection methods
        detections = [
            self.detect_stale_deal(deal),
            self.detect_stage_stagnation(deal),
            self.detect_low_win_probability(deal, ml_score),
            self.detect_overdue_close_date(deal),
        ]

        # Filter out None results
        anomalies = [d for d in detections if d is not None]

        return anomalies

    def analyze_workspace_deals(self, deals: List[Dict], ml_scores: Optional[Dict] = None) -> List[Dict]:
        """
        Analyze all deals in a workspace for anomalies

        Args:
            deals: List of deals with activities
            ml_scores: Optional dict mapping deal IDs to ML scores

        Returns:
            List of all detected anomalies with deal_id added
        """
        all_anomalies = []

        for deal in deals:
            deal_id = deal['id']
            ml_score = ml_scores.get(deal_id) if ml_scores else None

            anomalies = self.analyze_deal(deal, ml_score)

            # Add deal_id to each anomaly
            for anomaly in anomalies:
                anomaly['deal_id'] = deal_id
                anomaly['deal_title'] = deal.get('title', 'Untitled Deal')
                anomaly['deal_value'] = deal.get('value', 0)

            all_anomalies.extend(anomalies)

        # Sort by priority (critical > high > medium > low)
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        all_anomalies.sort(key=lambda a: priority_order.get(a['priority'], 99))

        return all_anomalies


# Singleton instance
_anomaly_detector = None


def get_anomaly_detector() -> AnomalyDetector:
    """Get or create anomaly detector singleton"""
    global _anomaly_detector
    if _anomaly_detector is None:
        _anomaly_detector = AnomalyDetector()
    return _anomaly_detector
