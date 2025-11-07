"""
VectorOS ML Deal Scorer Service
Loads trained XGBoost model and predicts deal win/loss probability
"""

import joblib
import numpy as np
from typing import Dict, List, Optional
import logging
import os

from .feature_engineering import get_feature_engineer

logger = logging.getLogger(__name__)


class MLDealScorer:
    """Predict deal outcomes using trained XGBoost model"""

    def __init__(self, model_path: str = 'models/deal_classifier_v1.pkl'):
        """Initialize scorer with trained model"""
        self.model_path = model_path
        self.model = None
        self.feature_names = None
        self.model_version = None
        self.feature_engineer = get_feature_engineer()

        # Load model on initialization
        self._load_model()

    def _load_model(self):
        """Load trained model from disk"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found: {self.model_path}")

        try:
            model_data = joblib.load(self.model_path)
            self.model = model_data['model']
            self.feature_names = model_data['feature_names']
            self.model_version = model_data.get('model_version', 'unknown')

            logger.info(f"ML Model loaded successfully: {self.model_path}")
            logger.info(f"Model version: {self.model_version}")
            logger.info(f"Features: {len(self.feature_names)}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def score_deal(self, deal: Dict, similar_deals: Optional[List[Dict]] = None) -> Dict:
        """
        Score a single deal and return ML prediction

        Args:
            deal: Deal dictionary with all fields
            similar_deals: Optional list of similar deals from vector search

        Returns:
            {
                'win_probability': float (0-1),
                'prediction': str ('won' or 'lost'),
                'confidence': float (0-1),
                'risk_level': str ('low', 'medium', 'high', 'critical'),
                'model_version': str
            }
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")

        # Extract features
        features = self.feature_engineer.extract_features(deal, similar_deals)

        # Convert to feature vector in correct order
        feature_vector = np.array([[features.get(name, 0) for name in self.feature_names]])

        # Predict probability
        win_probability = float(self.model.predict_proba(feature_vector)[0, 1])

        # Predict class
        prediction = 'won' if win_probability >= 0.5 else 'lost'

        # Calculate confidence (how far from decision boundary)
        confidence = abs(win_probability - 0.5) * 2  # 0 = on boundary, 1 = certain

        # Calculate risk level (inverse of win probability)
        if win_probability >= 0.75:
            risk_level = 'low'
        elif win_probability >= 0.50:
            risk_level = 'medium'
        elif win_probability >= 0.25:
            risk_level = 'high'
        else:
            risk_level = 'critical'

        return {
            'win_probability': round(win_probability, 4),
            'loss_probability': round(1 - win_probability, 4),
            'prediction': prediction,
            'confidence': round(confidence, 4),
            'risk_level': risk_level,
            'model_version': self.model_version,
            'features_used': len(self.feature_names)
        }

    def score_multiple_deals(self, deals: List[Dict], similar_deals_map: Optional[Dict] = None) -> List[Dict]:
        """
        Score multiple deals in batch

        Args:
            deals: List of deal dictionaries
            similar_deals_map: Optional dict mapping deal IDs to similar deals

        Returns:
            List of scoring results with deal IDs
        """
        results = []

        for deal in deals:
            deal_id = deal.get('id')
            similar_deals = similar_deals_map.get(deal_id) if similar_deals_map else None

            try:
                score = self.score_deal(deal, similar_deals)
                score['deal_id'] = deal_id
                results.append(score)
            except Exception as e:
                logger.error(f"Failed to score deal {deal_id}: {e}")
                results.append({
                    'deal_id': deal_id,
                    'error': str(e)
                })

        return results

    def get_feature_importance(self) -> List[Dict]:
        """Get feature importance scores from model"""
        if self.model is None:
            raise RuntimeError("Model not loaded")

        importance = self.model.feature_importances_
        feature_importance = [
            {'feature': name, 'importance': float(score)}
            for name, score in zip(self.feature_names, importance)
        ]

        # Sort by importance descending
        feature_importance.sort(key=lambda x: x['importance'], reverse=True)

        return feature_importance

    def get_model_info(self) -> Dict:
        """Get model metadata"""
        if self.model is None:
            raise RuntimeError("Model not loaded")

        return {
            'model_version': self.model_version,
            'model_type': 'XGBoost Binary Classifier',
            'num_features': len(self.feature_names),
            'feature_names': self.feature_names,
            'model_path': self.model_path
        }


# Singleton instance
_ml_scorer = None


def get_ml_deal_scorer(model_path: str = 'models/deal_classifier_v1.pkl') -> MLDealScorer:
    """Get or create ML deal scorer singleton"""
    global _ml_scorer
    if _ml_scorer is None:
        _ml_scorer = MLDealScorer(model_path=model_path)
    return _ml_scorer
