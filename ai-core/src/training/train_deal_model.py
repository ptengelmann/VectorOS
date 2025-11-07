"""
VectorOS Deal Scoring Model Training
Trains XGBoost classifier to predict deal win/loss
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
import joblib
import logging
from datetime import datetime

from utils.synthetic_data_generator import get_synthetic_generator
from services.feature_engineering import get_feature_engineer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DealModelTrainer:
    """Train and evaluate deal scoring model"""

    def __init__(self):
        self.model = None
        self.feature_names = None
        self.model_version = datetime.now().strftime("%Y%m%d_%H%M%S")

    def prepare_training_data(self, num_deals: int = 200):
        """
        Generate synthetic deals and extract features

        Returns:
            X: Feature matrix (n_samples, n_features)
            y: Target labels (0=lost, 1=won)
            deals: Original deal data
        """
        logger.info(f"Generating {num_deals} synthetic deals...")
        generator = get_synthetic_generator()
        deals = generator.generate_deals(num_deals=num_deals)

        logger.info("Extracting features...")
        feature_engineer = get_feature_engineer()
        self.feature_names = feature_engineer.get_feature_names()

        X = []
        y = []

        for deal in deals:
            # Extract features (without similarity features for now - would need vector DB)
            features = feature_engineer.extract_features(deal, similar_deals=None)

            # Convert to feature vector in correct order
            feature_vector = [features.get(name, 0) for name in self.feature_names]
            X.append(feature_vector)

            # Target: 1 for won, 0 for lost
            y.append(1 if deal['outcome'] == 'won' else 0)

        X = np.array(X)
        y = np.array(y)

        logger.info(f"Prepared {len(X)} samples with {len(self.feature_names)} features")
        logger.info(f"Class distribution: {sum(y)} won, {len(y)-sum(y)} lost")

        return X, y, deals

    def train(self, X, y, test_size=0.2, random_state=42):
        """
        Train XGBoost model with hyperparameter tuning

        Args:
            X: Feature matrix
            y: Target labels
            test_size: Proportion of data for testing
            random_state: Random seed

        Returns:
            Model performance metrics
        """
        logger.info("Splitting data into train/test sets...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )

        logger.info(f"Train set: {len(X_train)} samples")
        logger.info(f"Test set: {len(X_test)} samples")

        # XGBoost parameters optimized for deal scoring
        params = {
            'objective': 'binary:logistic',
            'eval_metric': 'logloss',
            'max_depth': 6,
            'learning_rate': 0.1,
            'n_estimators': 100,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'min_child_weight': 3,
            'gamma': 0.1,
            'reg_alpha': 0.01,
            'reg_lambda': 1.0,
            'random_state': random_state,
            'scale_pos_weight': (len(y) - sum(y)) / sum(y)  # Handle class imbalance
        }

        logger.info("Training XGBoost model...")
        self.model = xgb.XGBClassifier(**params)
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False
        )

        logger.info("Model training complete!")

        # Evaluate on test set
        metrics = self.evaluate(X_test, y_test)

        # Cross-validation
        logger.info("Running 5-fold cross-validation...")
        cv_scores = cross_val_score(self.model, X_train, y_train, cv=5, scoring='accuracy')
        metrics['cv_mean'] = cv_scores.mean()
        metrics['cv_std'] = cv_scores.std()
        logger.info(f"CV Accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

        return metrics

    def evaluate(self, X_test, y_test):
        """Evaluate model performance"""
        logger.info("Evaluating model...")

        # Predictions
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]

        # Metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc_auc = roc_auc_score(y_test, y_pred_proba)

        logger.info(f"Accuracy: {accuracy:.3f}")
        logger.info(f"Precision: {precision:.3f}")
        logger.info(f"Recall: {recall:.3f}")
        logger.info(f"F1 Score: {f1:.3f}")
        logger.info(f"ROC-AUC: {roc_auc:.3f}")

        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        logger.info(f"Confusion Matrix:\n{cm}")

        # Classification report
        logger.info("Classification Report:")
        logger.info(f"\n{classification_report(y_test, y_pred, target_names=['Lost', 'Won'])}")

        metrics = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'roc_auc': roc_auc,
            'confusion_matrix': cm.tolist(),
            'test_samples': len(y_test)
        }

        return metrics

    def get_feature_importance(self, top_n=10):
        """Get top N most important features"""
        if self.model is None:
            raise ValueError("Model must be trained first")

        importance = self.model.feature_importances_
        feature_importance = list(zip(self.feature_names, importance))
        feature_importance.sort(key=lambda x: x[1], reverse=True)

        logger.info(f"\nTop {top_n} Most Important Features:")
        for i, (name, score) in enumerate(feature_importance[:top_n], 1):
            logger.info(f"{i}. {name}: {score:.4f}")

        return feature_importance[:top_n]

    def save_model(self, filepath='models/deal_classifier_v1.pkl'):
        """Save trained model to disk"""
        if self.model is None:
            raise ValueError("Model must be trained first")

        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        model_data = {
            'model': self.model,
            'feature_names': self.feature_names,
            'model_version': self.model_version,
            'trained_at': datetime.now().isoformat()
        }

        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")

        return filepath

    def load_model(self, filepath='models/deal_classifier_v1.pkl'):
        """Load trained model from disk"""
        model_data = joblib.load(filepath)
        self.model = model_data['model']
        self.feature_names = model_data['feature_names']
        self.model_version = model_data.get('model_version', 'unknown')

        logger.info(f"Model loaded from {filepath}")
        logger.info(f"Model version: {self.model_version}")

        return self.model


def main():
    """Train and save deal scoring model"""
    print("=" * 70)
    print("VectorOS DEAL SCORING MODEL TRAINING")
    print("=" * 70)
    print()

    trainer = DealModelTrainer()

    # Generate training data
    X, y, deals = trainer.prepare_training_data(num_deals=200)

    # Train model
    print()
    print("-" * 70)
    print("TRAINING MODEL")
    print("-" * 70)
    metrics = trainer.train(X, y)

    # Feature importance
    print()
    print("-" * 70)
    print("FEATURE IMPORTANCE")
    print("-" * 70)
    trainer.get_feature_importance(top_n=15)

    # Save model
    print()
    print("-" * 70)
    print("SAVING MODEL")
    print("-" * 70)
    model_path = trainer.save_model()

    # Summary
    print()
    print("=" * 70)
    print("TRAINING COMPLETE")
    print("=" * 70)
    print(f"Model Version: {trainer.model_version}")
    print(f"Model Path: {model_path}")
    print(f"Training Samples: {len(X)}")
    print(f"Test Accuracy: {metrics['accuracy']:.1%}")
    print(f"Precision: {metrics['precision']:.1%}")
    print(f"Recall: {metrics['recall']:.1%}")
    print(f"F1 Score: {metrics['f1']:.1%}")
    print(f"ROC-AUC: {metrics['roc_auc']:.1%}")
    print(f"CV Accuracy: {metrics['cv_mean']:.1%} (+/- {metrics['cv_std']:.1%})")
    print("=" * 70)


if __name__ == "__main__":
    main()
