"""
VectorOS Feature Engineering Service
Extracts ML features from deals for training and prediction
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class FeatureEngineer:
    def __init__(self):
        """Initialize feature engineering service"""
        logger.info("Feature Engineering service initialized")

    def extract_features(self, deal: Dict, similar_deals: Optional[List[Dict]] = None) -> Dict:
        """
        Extract ML features from a single deal

        Args:
            deal: Deal dictionary with all deal data
            similar_deals: Optional list of similar deals from vector search

        Returns:
            Dictionary of features ready for ML model
        """
        features = {}

        # ===== Temporal Features =====
        features.update(self._extract_temporal_features(deal))

        # ===== Value Features =====
        features.update(self._extract_value_features(deal))

        # ===== Stage Features =====
        features.update(self._extract_stage_features(deal))

        # ===== Probability Features =====
        features.update(self._extract_probability_features(deal))

        # ===== Activity Features =====
        features.update(self._extract_activity_features(deal))

        # ===== Vector Similarity Features =====
        if similar_deals:
            features.update(self._extract_similarity_features(similar_deals))

        logger.debug(f"Extracted {len(features)} features for deal {deal.get('id')}")
        return features

    def _extract_temporal_features(self, deal: Dict) -> Dict:
        """Extract time-based features"""
        features = {}
        now = datetime.utcnow()

        # Deal age (days since creation)
        created_at = deal.get('createdAt')
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            deal_age_days = (now - created_at).days
            features['deal_age_days'] = deal_age_days
            features['deal_age_weeks'] = deal_age_days / 7
        else:
            features['deal_age_days'] = 0
            features['deal_age_weeks'] = 0

        # Time until close date
        close_date = deal.get('closeDate')
        if close_date:
            if isinstance(close_date, str):
                close_date = datetime.fromisoformat(close_date.replace('Z', '+00:00'))
            days_until_close = (close_date - now).days
            features['days_until_close'] = days_until_close
            features['is_overdue'] = 1 if days_until_close < 0 else 0
        else:
            features['days_until_close'] = 9999  # No close date set
            features['is_overdue'] = 0

        # Time in current stage (would need stage change tracking - placeholder for now)
        features['days_in_stage'] = deal_age_days  # Simplified

        return features

    def _extract_value_features(self, deal: Dict) -> Dict:
        """Extract value-related features"""
        features = {}

        value = deal.get('value', 0) or 0

        # Value tiers
        features['deal_value'] = float(value)

        if value == 0:
            features['value_tier'] = 0  # No value
        elif value < 10000:
            features['value_tier'] = 1  # Small
        elif value < 50000:
            features['value_tier'] = 2  # Medium
        elif value < 100000:
            features['value_tier'] = 3  # Large
        else:
            features['value_tier'] = 4  # Enterprise

        # Log value (helps with skewed distributions)
        import math
        features['log_value'] = math.log1p(value)  # log(1 + value) to handle 0

        return features

    def _extract_stage_features(self, deal: Dict) -> Dict:
        """Extract stage-related features"""
        features = {}

        stage = deal.get('stage', '').lower()

        # One-hot encode stages
        stage_mapping = {
            'lead': 0,
            'qualified': 1,
            'proposal': 2,
            'negotiation': 3,
            'won': 4,
            'lost': 5
        }

        features['stage_ordinal'] = stage_mapping.get(stage, 0)

        # Stage progression (normalized 0-1)
        if stage in ['won', 'lost']:
            features['stage_progress'] = 1.0
        elif stage == 'negotiation':
            features['stage_progress'] = 0.75
        elif stage == 'proposal':
            features['stage_progress'] = 0.5
        elif stage == 'qualified':
            features['stage_progress'] = 0.25
        else:
            features['stage_progress'] = 0.0

        return features

    def _extract_probability_features(self, deal: Dict) -> Dict:
        """Extract probability-related features"""
        features = {}

        probability = deal.get('probability', 50) or 50

        features['probability'] = float(probability) / 100.0  # Normalize to 0-1

        # Probability categories
        if probability >= 80:
            features['prob_category'] = 4  # Very high
        elif probability >= 60:
            features['prob_category'] = 3  # High
        elif probability >= 40:
            features['prob_category'] = 2  # Medium
        elif probability >= 20:
            features['prob_category'] = 1  # Low
        else:
            features['prob_category'] = 0  # Very low

        # Probability risk flags
        features['is_high_confidence'] = 1 if probability >= 75 else 0
        features['is_low_confidence'] = 1 if probability <= 25 else 0

        return features

    def _extract_activity_features(self, deal: Dict) -> Dict:
        """Extract activity-related features"""
        features = {}

        activities = deal.get('activities', [])

        # Activity count
        features['activity_count'] = len(activities)

        # Activity frequency (activities per day)
        deal_age_days = features.get('deal_age_days', 1)
        if deal_age_days > 0:
            features['activities_per_day'] = len(activities) / max(deal_age_days, 1)
        else:
            features['activities_per_day'] = 0

        # Recent activity (last 7 days)
        now = datetime.utcnow()
        recent_activities = 0
        for activity in activities:
            created_at = activity.get('createdAt')
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                if (now - created_at).days <= 7:
                    recent_activities += 1

        features['recent_activity_count'] = recent_activities

        # Activity types (if available)
        activity_types = [a.get('type', '').lower() for a in activities]
        features['email_count'] = activity_types.count('email')
        features['call_count'] = activity_types.count('call')
        features['meeting_count'] = activity_types.count('meeting')

        # Days since last activity
        if activities:
            latest_activity = max(
                activities,
                key=lambda a: a.get('createdAt', ''),
                default=None
            )
            if latest_activity:
                created_at = latest_activity.get('createdAt')
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                features['days_since_last_activity'] = (now - created_at).days
            else:
                features['days_since_last_activity'] = 999
        else:
            features['days_since_last_activity'] = 999

        return features

    def _extract_similarity_features(self, similar_deals: List[Dict]) -> Dict:
        """Extract features from similar deals (from vector search)"""
        features = {}

        if not similar_deals:
            features['similar_deals_count'] = 0
            features['similar_won_ratio'] = 0.0
            features['avg_similar_value'] = 0.0
            return features

        features['similar_deals_count'] = len(similar_deals)

        # Outcome statistics from similar deals
        won_count = sum(1 for d in similar_deals if d.get('outcome') == 'won')
        lost_count = sum(1 for d in similar_deals if d.get('outcome') == 'lost')
        total_with_outcome = won_count + lost_count

        if total_with_outcome > 0:
            features['similar_won_ratio'] = won_count / total_with_outcome
            features['similar_lost_ratio'] = lost_count / total_with_outcome
        else:
            features['similar_won_ratio'] = 0.5  # Neutral if no historical data
            features['similar_lost_ratio'] = 0.5

        # Average value of similar deals
        values = [d.get('value', 0) for d in similar_deals if d.get('value')]
        if values:
            features['avg_similar_value'] = sum(values) / len(values)
            features['max_similar_value'] = max(values)
            features['min_similar_value'] = min(values)
        else:
            features['avg_similar_value'] = 0.0
            features['max_similar_value'] = 0.0
            features['min_similar_value'] = 0.0

        # Average similarity score
        similarity_scores = [d.get('similarity_score', 0) for d in similar_deals]
        if similarity_scores:
            features['avg_similarity_score'] = sum(similarity_scores) / len(similarity_scores)
            features['max_similarity_score'] = max(similarity_scores)
        else:
            features['avg_similarity_score'] = 0.0
            features['max_similarity_score'] = 0.0

        return features

    def get_feature_names(self) -> List[str]:
        """
        Get list of all feature names (for model training)

        Returns:
            List of feature names in expected order
        """
        return [
            # Temporal
            'deal_age_days',
            'deal_age_weeks',
            'days_until_close',
            'is_overdue',
            'days_in_stage',

            # Value
            'deal_value',
            'value_tier',
            'log_value',

            # Stage
            'stage_ordinal',
            'stage_progress',

            # Probability
            'probability',
            'prob_category',
            'is_high_confidence',
            'is_low_confidence',

            # Activity
            'activity_count',
            'activities_per_day',
            'recent_activity_count',
            'email_count',
            'call_count',
            'meeting_count',
            'days_since_last_activity',

            # Similarity
            'similar_deals_count',
            'similar_won_ratio',
            'similar_lost_ratio',
            'avg_similar_value',
            'max_similar_value',
            'min_similar_value',
            'avg_similarity_score',
            'max_similarity_score',
        ]


# Singleton instance
_feature_engineer = None


def get_feature_engineer() -> FeatureEngineer:
    """Get or create feature engineering service singleton"""
    global _feature_engineer
    if _feature_engineer is None:
        _feature_engineer = FeatureEngineer()
    return _feature_engineer
