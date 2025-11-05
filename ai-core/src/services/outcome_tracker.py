"""
Outcome Tracker - Learning System for VectorOS AI
Tracks predictions, measures accuracy, and enables continuous learning.

This is Week 2 of building the AI brain - teaching it to learn from outcomes.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import statistics

logger = logging.getLogger(__name__)


class OutcomeTracker:
    """
    Tracks AI predictions and outcomes to enable learning.

    This service:
    1. Records predictions when made
    2. Updates predictions with actual outcomes
    3. Calculates prediction accuracy
    4. Identifies areas where AI needs improvement
    5. Provides learning metrics
    """

    def __init__(self, db_client):
        """
        Initialize outcome tracker with database client.

        Args:
            db_client: Prisma client for database operations
        """
        self.db = db_client
        logger.info("OutcomeTracker initialized")

    async def record_prediction(
        self,
        deal_id: str,
        workspace_id: str,
        prediction_type: str,
        predicted_value: Optional[float] = None,
        predicted_category: Optional[str] = None,
        confidence: float = 0.0,
        factors_analyzed: Dict[str, Any] = None,
        reasoning: Optional[str] = None,
        model_version: str = "claude-sonnet-4-5-20250929"
    ) -> str:
        """
        Record an AI prediction for future accuracy measurement.

        Args:
            deal_id: Deal being predicted on
            workspace_id: Workspace identifier
            prediction_type: Type of prediction (win_probability, close_date, value, churn_risk)
            predicted_value: Numeric prediction (e.g., 0.75 for 75% win probability)
            predicted_category: Categorical prediction (e.g., "won", "lost")
            confidence: AI's confidence in prediction (0.0-1.0)
            factors_analyzed: What factors influenced this prediction
            reasoning: Why the AI made this prediction
            model_version: Which AI model made this prediction

        Returns:
            Prediction ID for tracking
        """
        try:
            # Store prediction in database
            prediction = await self.db.aIPrediction.create({
                "data": {
                    "dealId": deal_id,
                    "workspaceId": workspace_id,
                    "predictionType": prediction_type,
                    "predictedValue": predicted_value,
                    "predictedCategory": predicted_category,
                    "confidence": confidence,
                    "factorsAnalyzed": factors_analyzed or {},
                    "reasoning": reasoning,
                    "modelVersion": model_version,
                }
            })

            logger.info(f"Recorded {prediction_type} prediction for deal {deal_id}: {predicted_value or predicted_category}")
            return prediction.id

        except Exception as e:
            logger.error(f"Failed to record prediction: {e}")
            raise

    async def update_outcome(
        self,
        prediction_id: str,
        actual_outcome: str,
        actual_value: Optional[float] = None
    ) -> bool:
        """
        Update a prediction with the actual outcome.

        Args:
            prediction_id: ID of the prediction to update
            actual_outcome: What actually happened (e.g., "won", "lost")
            actual_value: Actual numeric value if applicable

        Returns:
            True if updated successfully
        """
        try:
            # Get the prediction
            prediction = await self.db.aIPrediction.findUnique({
                "where": {"id": prediction_id}
            })

            if not prediction:
                logger.warning(f"Prediction {prediction_id} not found")
                return False

            # Calculate prediction error
            prediction_error = None
            was_correct = None

            if prediction.predictedValue is not None and actual_value is not None:
                # Numeric prediction - calculate error
                prediction_error = abs(prediction.predictedValue - actual_value)
                # Consider "correct" if within 10% margin
                was_correct = prediction_error <= 0.1

            elif prediction.predictedCategory is not None:
                # Categorical prediction - exact match
                was_correct = prediction.predictedCategory == actual_outcome

            # Update prediction with outcome
            await self.db.aIPrediction.update({
                "where": {"id": prediction_id},
                "data": {
                    "actualOutcome": actual_outcome,
                    "actualValue": actual_value,
                    "predictionError": prediction_error,
                    "wasCorrect": was_correct,
                    "resolvedAt": datetime.utcnow().isoformat()
                }
            })

            logger.info(
                f"Updated prediction {prediction_id}: "
                f"predicted={prediction.predictedValue or prediction.predictedCategory}, "
                f"actual={actual_value or actual_outcome}, "
                f"correct={was_correct}"
            )

            return True

        except Exception as e:
            logger.error(f"Failed to update outcome: {e}")
            return False

    async def update_deal_outcome(
        self,
        deal_id: str,
        outcome: str,
        outcome_value: Optional[float] = None
    ) -> int:
        """
        Update all predictions for a deal when outcome is known.

        Args:
            deal_id: Deal identifier
            outcome: Final outcome (won, lost, abandoned)
            outcome_value: Final deal value if won

        Returns:
            Number of predictions updated
        """
        try:
            # Find all predictions for this deal
            predictions = await self.db.aIPrediction.findMany({
                "where": {"dealId": deal_id}
            })

            updated_count = 0
            for prediction in predictions:
                # Determine actual value based on prediction type
                actual_value = None
                if prediction.predictionType == "win_probability":
                    # Win probability: 1.0 if won, 0.0 if lost
                    actual_value = 1.0 if outcome == "won" else 0.0
                elif prediction.predictionType == "value" and outcome_value is not None:
                    actual_value = outcome_value

                # Update this prediction
                success = await self.update_outcome(
                    prediction.id,
                    outcome,
                    actual_value
                )
                if success:
                    updated_count += 1

            logger.info(f"Updated {updated_count} predictions for deal {deal_id}")
            return updated_count

        except Exception as e:
            logger.error(f"Failed to update deal outcomes: {e}")
            return 0

    async def get_accuracy_metrics(
        self,
        workspace_id: str,
        prediction_type: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get prediction accuracy metrics for learning.

        Args:
            workspace_id: Workspace to analyze
            prediction_type: Specific prediction type or None for all
            days: Number of days to look back

        Returns:
            Accuracy metrics and insights
        """
        try:
            since_date = datetime.utcnow() - timedelta(days=days)

            # Build query filter
            where_filter = {
                "workspaceId": workspace_id,
                "resolvedAt": {"gte": since_date.isoformat()},
                "wasCorrect": {"not": None}  # Only resolved predictions
            }

            if prediction_type:
                where_filter["predictionType"] = prediction_type

            # Get resolved predictions
            predictions = await self.db.aIPrediction.findMany({
                "where": where_filter,
                "orderBy": {"createdAt": "desc"}
            })

            if not predictions:
                return {
                    "total_predictions": 0,
                    "accuracy": 0.0,
                    "message": "No resolved predictions yet"
                }

            # Calculate metrics
            total = len(predictions)
            correct = sum(1 for p in predictions if p.wasCorrect)
            accuracy = (correct / total) * 100 if total > 0 else 0.0

            # Calculate average confidence
            confidences = [p.confidence for p in predictions if p.confidence]
            avg_confidence = statistics.mean(confidences) if confidences else 0.0

            # Calculate error statistics for numeric predictions
            errors = [p.predictionError for p in predictions if p.predictionError is not None]
            avg_error = statistics.mean(errors) if errors else None
            median_error = statistics.median(errors) if errors else None

            # Group by prediction type
            by_type = {}
            for pred in predictions:
                pred_type = pred.predictionType
                if pred_type not in by_type:
                    by_type[pred_type] = {"total": 0, "correct": 0}
                by_type[pred_type]["total"] += 1
                if pred.wasCorrect:
                    by_type[pred_type]["correct"] += 1

            # Calculate accuracy by type
            type_accuracy = {}
            for pred_type, stats in by_type.items():
                type_accuracy[pred_type] = {
                    "accuracy": (stats["correct"] / stats["total"]) * 100,
                    "total": stats["total"]
                }

            # Identify improvement areas (< 70% accuracy)
            improvement_areas = [
                pred_type for pred_type, metrics in type_accuracy.items()
                if metrics["accuracy"] < 70.0
            ]

            return {
                "total_predictions": total,
                "correct_predictions": correct,
                "accuracy_percentage": round(accuracy, 2),
                "average_confidence": round(avg_confidence, 2),
                "average_error": round(avg_error, 4) if avg_error else None,
                "median_error": round(median_error, 4) if median_error else None,
                "accuracy_by_type": type_accuracy,
                "improvement_areas": improvement_areas,
                "time_period_days": days,
                "learning_status": self._get_learning_status(accuracy)
            }

        except Exception as e:
            logger.error(f"Failed to calculate accuracy metrics: {e}")
            return {
                "error": str(e),
                "total_predictions": 0
            }

    def _get_learning_status(self, accuracy: float) -> str:
        """Determine learning status based on accuracy."""
        if accuracy >= 85:
            return "excellent"
        elif accuracy >= 75:
            return "good"
        elif accuracy >= 60:
            return "improving"
        else:
            return "needs_training"

    async def record_recommendation_feedback(
        self,
        recommendation_id: str,
        workspace_id: str,
        user_action: str,
        was_helpful: Optional[bool] = None,
        user_comment: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> str:
        """
        Record user feedback on AI recommendations.

        Args:
            recommendation_id: ID of the insight or prediction
            workspace_id: Workspace identifier
            user_action: What the user did (accepted, rejected, modified, dismissed)
            was_helpful: Whether user found it helpful
            user_comment: Optional user feedback text
            user_id: User who provided feedback

        Returns:
            Feedback ID
        """
        try:
            feedback = await self.db.recommendationFeedback.create({
                "data": {
                    "recommendationId": recommendation_id,
                    "workspaceId": workspace_id,
                    "userAction": user_action,
                    "wasHelpful": was_helpful,
                    "userComment": user_comment,
                    "userId": user_id
                }
            })

            logger.info(f"Recorded feedback for recommendation {recommendation_id}: {user_action}")
            return feedback.id

        except Exception as e:
            logger.error(f"Failed to record feedback: {e}")
            raise

    async def get_recommendation_effectiveness(
        self,
        workspace_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Analyze how effective AI recommendations have been.

        Args:
            workspace_id: Workspace to analyze
            days: Number of days to look back

        Returns:
            Recommendation effectiveness metrics
        """
        try:
            since_date = datetime.utcnow() - timedelta(days=days)

            feedbacks = await self.db.recommendationFeedback.findMany({
                "where": {
                    "workspaceId": workspace_id,
                    "createdAt": {"gte": since_date.isoformat()}
                }
            })

            if not feedbacks:
                return {
                    "total_feedback": 0,
                    "message": "No recommendation feedback yet"
                }

            total = len(feedbacks)

            # Count by action
            actions = {}
            helpful_count = 0
            helpful_total = 0

            for feedback in feedbacks:
                action = feedback.userAction
                actions[action] = actions.get(action, 0) + 1

                if feedback.wasHelpful is not None:
                    helpful_total += 1
                    if feedback.wasHelpful:
                        helpful_count += 1

            # Calculate acceptance rate
            accepted = actions.get("accepted", 0)
            acceptance_rate = (accepted / total) * 100 if total > 0 else 0.0

            # Calculate helpfulness rate
            helpfulness_rate = (helpful_count / helpful_total) * 100 if helpful_total > 0 else 0.0

            return {
                "total_feedback": total,
                "acceptance_rate": round(acceptance_rate, 2),
                "helpfulness_rate": round(helpfulness_rate, 2),
                "actions_breakdown": actions,
                "time_period_days": days,
                "status": "effective" if acceptance_rate >= 70 else "needs_improvement"
            }

        except Exception as e:
            logger.error(f"Failed to get recommendation effectiveness: {e}")
            return {"error": str(e)}


# Singleton instance
_outcome_tracker: Optional[OutcomeTracker] = None


def get_outcome_tracker(db_client) -> OutcomeTracker:
    """Get or create the outcome tracker singleton."""
    global _outcome_tracker
    if _outcome_tracker is None:
        _outcome_tracker = OutcomeTracker(db_client)
    return _outcome_tracker
