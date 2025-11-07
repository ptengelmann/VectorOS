"""
VectorOS Synthetic Training Data Generator
Generates realistic deal data with outcomes for ML model training
"""

import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class SyntheticDataGenerator:
    """Generate synthetic deals with realistic patterns for ML training"""

    def __init__(self, seed: int = 42):
        """Initialize generator with random seed for reproducibility"""
        random.seed(seed)
        self.seed = seed
        logger.info(f"Synthetic data generator initialized with seed {seed}")

    def generate_deals(self, num_deals: int = 200, workspace_id: str = None) -> List[Dict]:
        """
        Generate synthetic deals with realistic patterns

        Args:
            num_deals: Number of deals to generate
            workspace_id: Workspace ID for deals

        Returns:
            List of deal dictionaries with outcomes
        """
        if workspace_id is None:
            workspace_id = str(uuid.uuid4())

        deals = []
        for i in range(num_deals):
            deal = self._generate_single_deal(workspace_id, i)
            deals.append(deal)

        # Calculate statistics
        won_count = sum(1 for d in deals if d['outcome'] == 'won')
        lost_count = sum(1 for d in deals if d['outcome'] == 'lost')
        logger.info(f"Generated {num_deals} deals: {won_count} won, {lost_count} lost")

        return deals

    def _generate_single_deal(self, workspace_id: str, index: int) -> Dict:
        """Generate a single realistic deal with outcome"""

        # Decide outcome first (so we can make patterns realistic)
        outcome = self._determine_outcome()

        # Generate base attributes
        deal = {
            'id': str(uuid.uuid4()),
            'workspaceId': workspace_id,
            'title': self._generate_title(),
            'company': self._generate_company_name(),
            'value': self._generate_value(outcome),
            'stage': self._generate_stage(outcome),
            'probability': self._generate_probability(outcome),
            'contactName': self._generate_contact_name(),
            'contactEmail': None,  # Optional
            'source': random.choice(['manual', 'hubspot', 'salesforce', 'outreach']),
            'outcome': outcome,
            'lostReason': self._generate_lost_reason() if outcome == 'lost' else None,
        }

        # Generate timestamps
        timestamps = self._generate_timestamps(outcome)
        deal.update(timestamps)

        # Generate activities based on outcome
        deal['activities'] = self._generate_activities(
            deal['createdAt'],
            deal.get('closedAt'),
            outcome
        )

        return deal

    def _determine_outcome(self) -> str:
        """
        Determine deal outcome with realistic win/loss ratio
        Industry average: 20-30% win rate for B2B SaaS
        """
        rand = random.random()
        if rand < 0.27:  # 27% win rate
            return 'won'
        else:
            return 'lost'

    def _generate_title(self) -> str:
        """Generate realistic deal title"""
        prefixes = [
            'Enterprise Plan',
            'Annual Subscription',
            'Platform Upgrade',
            'New Business',
            'Expansion Deal',
            'Strategic Partnership',
            'Implementation',
            'Professional Services',
            'Custom Solution',
            'Team License'
        ]
        companies = [
            'Acme Corp', 'TechStart Inc', 'Global Solutions', 'Digital Systems',
            'Innovation Labs', 'Cloud Services Co', 'Data Dynamics', 'AI Ventures',
            'Future Tech', 'Scale Partners', 'Growth Systems', 'Quantum Corp'
        ]
        return f"{random.choice(prefixes)} - {random.choice(companies)}"

    def _generate_company_name(self) -> str:
        """Generate company name"""
        names = [
            'Acme Corp', 'TechStart Inc', 'Global Solutions', 'Digital Systems',
            'Innovation Labs', 'Cloud Services Co', 'Data Dynamics', 'AI Ventures',
            'Future Tech', 'Scale Partners', 'Growth Systems', 'Quantum Corp',
            'Nexus Group', 'Velocity Inc', 'Horizon Tech', 'Summit Solutions',
            'Apex Systems', 'Prime Ventures', 'Catalyst Partners', 'Momentum LLC'
        ]
        return random.choice(names)

    def _generate_contact_name(self) -> str:
        """Generate contact name"""
        first_names = [
            'John', 'Sarah', 'Michael', 'Emily', 'David', 'Jennifer',
            'Robert', 'Lisa', 'James', 'Maria', 'William', 'Susan',
            'Richard', 'Jessica', 'Thomas', 'Karen', 'Daniel', 'Nancy'
        ]
        last_names = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
            'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez',
            'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson'
        ]
        return f"{random.choice(first_names)} {random.choice(last_names)}"

    def _generate_value(self, outcome: str) -> float:
        """
        Generate deal value with realistic patterns
        Won deals tend to be slightly higher value (proven ROI)
        """
        if outcome == 'won':
            # Won deals: $10K - $500K, skewed toward mid-range
            if random.random() < 0.6:
                return round(random.uniform(25000, 100000), 2)
            elif random.random() < 0.3:
                return round(random.uniform(100000, 250000), 2)
            else:
                return round(random.uniform(10000, 25000), 2)
        else:
            # Lost deals: wider range, more at lower end
            if random.random() < 0.5:
                return round(random.uniform(5000, 30000), 2)
            elif random.random() < 0.3:
                return round(random.uniform(30000, 100000), 2)
            else:
                return round(random.uniform(100000, 500000), 2)

    def _generate_stage(self, outcome: str) -> str:
        """
        Generate stage based on outcome
        Won deals progress through stages, lost deals often stall
        """
        if outcome == 'won':
            return 'won'
        else:
            # Lost deals distributed across stages
            stages = ['qualified', 'proposal', 'negotiation', 'lost']
            weights = [0.15, 0.35, 0.35, 0.15]  # More losses in middle stages
            return random.choices(stages, weights=weights)[0]

    def _generate_probability(self, outcome: str) -> int:
        """
        Generate probability that correlates with outcome
        Won deals had higher probabilities, but not always (surprises happen)
        """
        if outcome == 'won':
            # Won deals: mostly 60-95%, some surprises (20-60%)
            if random.random() < 0.8:
                return random.randint(70, 95)
            else:
                return random.randint(40, 70)  # Unexpected wins
        else:
            # Lost deals: mostly 20-70%, some were promising (70-90%)
            if random.random() < 0.7:
                return random.randint(20, 60)
            else:
                return random.randint(60, 90)  # Promising but lost

    def _generate_lost_reason(self) -> str:
        """Generate realistic reason for losing deal"""
        reasons = [
            'Price too high',
            'Chose competitor',
            'Budget constraints',
            'No decision / stalled',
            'Timing not right',
            'Feature gap',
            'Internal champion left',
            'Business priorities changed',
            'Technical fit issues',
            'Contract terms',
            'Implementation complexity',
            'Lost to status quo'
        ]
        return random.choice(reasons)

    def _generate_timestamps(self, outcome: str) -> Dict:
        """Generate realistic timestamps for deal lifecycle"""
        now = datetime.utcnow()

        # Created date: 1-180 days ago
        days_ago = random.randint(1, 180)
        created_at = now - timedelta(days=days_ago)

        # Close date: future for active, past for closed
        if outcome in ['won', 'lost']:
            # Closed deals: closed 1-60 days ago
            closed_days_ago = random.randint(1, min(60, days_ago))
            closed_at = now - timedelta(days=closed_days_ago)

            # Close date was set before closing
            close_date = closed_at - timedelta(days=random.randint(0, 30))
        else:
            # Active deals
            closed_at = None
            # Close date in future (7-90 days)
            close_date = now + timedelta(days=random.randint(7, 90))

        return {
            'createdAt': created_at.isoformat() + 'Z',
            'updatedAt': (closed_at or now).isoformat() + 'Z',
            'closeDate': close_date.isoformat() + 'Z' if close_date else None,
            'closedAt': closed_at.isoformat() + 'Z' if closed_at else None,
        }

    def _generate_activities(
        self,
        created_at: str,
        closed_at: str,
        outcome: str
    ) -> List[Dict]:
        """
        Generate realistic activities
        Won deals have more consistent activity, lost deals often go stale
        """
        # Keep as naive datetimes (no timezone) for isoformat consistency
        created = datetime.fromisoformat(created_at.replace('Z', ''))
        closed = datetime.fromisoformat(closed_at.replace('Z', '')) if closed_at else datetime.utcnow()

        deal_duration_days = (closed - created).days

        # Activity count based on outcome and duration
        if outcome == 'won':
            # Won deals: ~3-8 activities per month
            activities_per_month = random.uniform(3, 8)
        else:
            # Lost deals: ~1-4 activities per month (less engaged)
            activities_per_month = random.uniform(1, 4)

        num_activities = int((deal_duration_days / 30) * activities_per_month)
        num_activities = max(1, min(num_activities, 50))  # 1-50 activities

        activities = []
        activity_types = ['email', 'call', 'meeting', 'note']

        for i in range(num_activities):
            # Distribute activities across deal lifetime
            days_offset = random.uniform(0, deal_duration_days)
            activity_date = created + timedelta(days=days_offset)

            activity = {
                'id': str(uuid.uuid4()),
                'type': random.choice(activity_types),
                'subject': self._generate_activity_subject(),
                'content': None,
                'scheduledAt': None,
                'completedAt': activity_date.isoformat() + 'Z',
                'createdAt': activity_date.isoformat() + 'Z',
                'updatedAt': activity_date.isoformat() + 'Z',
            }
            activities.append(activity)

        # Sort by date
        activities.sort(key=lambda x: x['createdAt'])

        return activities

    def _generate_activity_subject(self) -> str:
        """Generate realistic activity subject"""
        subjects = [
            'Discovery Call',
            'Demo Walkthrough',
            'Pricing Discussion',
            'Follow-up Email',
            'Technical Questions',
            'Contract Review',
            'Stakeholder Meeting',
            'Executive Briefing',
            'Implementation Planning',
            'Check-in Call',
            'Product Demo',
            'ROI Analysis',
            'Security Review',
            'Reference Call',
            'Final Proposal'
        ]
        return random.choice(subjects)

    def export_to_json(self, deals: List[Dict], filepath: str) -> None:
        """Export generated deals to JSON file"""
        import json
        with open(filepath, 'w') as f:
            json.dump(deals, f, indent=2)
        logger.info(f"Exported {len(deals)} deals to {filepath}")

    def get_statistics(self, deals: List[Dict]) -> Dict:
        """Calculate statistics about generated deals"""
        won = [d for d in deals if d['outcome'] == 'won']
        lost = [d for d in deals if d['outcome'] == 'lost']

        stats = {
            'total_deals': len(deals),
            'won_count': len(won),
            'lost_count': len(lost),
            'win_rate': len(won) / len(deals) if deals else 0,
            'avg_value_won': sum(d['value'] for d in won) / len(won) if won else 0,
            'avg_value_lost': sum(d['value'] for d in lost) / len(lost) if lost else 0,
            'avg_probability_won': sum(d['probability'] for d in won) / len(won) if won else 0,
            'avg_probability_lost': sum(d['probability'] for d in lost) / len(lost) if lost else 0,
            'avg_activities_won': sum(len(d['activities']) for d in won) / len(won) if won else 0,
            'avg_activities_lost': sum(len(d['activities']) for d in lost) / len(lost) if lost else 0,
        }

        return stats


# Singleton instance
_generator = None


def get_synthetic_generator(seed: int = 42) -> SyntheticDataGenerator:
    """Get or create synthetic data generator"""
    global _generator
    if _generator is None:
        _generator = SyntheticDataGenerator(seed=seed)
    return _generator


# CLI usage
if __name__ == "__main__":
    generator = SyntheticDataGenerator(seed=42)
    deals = generator.generate_deals(num_deals=200)
    stats = generator.get_statistics(deals)

    print("=" * 60)
    print("SYNTHETIC TRAINING DATA GENERATED")
    print("=" * 60)
    print(f"Total Deals: {stats['total_deals']}")
    print(f"Won: {stats['won_count']} ({stats['win_rate']:.1%})")
    print(f"Lost: {stats['lost_count']} ({1-stats['win_rate']:.1%})")
    print()
    print("Won Deals:")
    print(f"  Avg Value: ${stats['avg_value_won']:,.2f}")
    print(f"  Avg Probability: {stats['avg_probability_won']:.1f}%")
    print(f"  Avg Activities: {stats['avg_activities_won']:.1f}")
    print()
    print("Lost Deals:")
    print(f"  Avg Value: ${stats['avg_value_lost']:,.2f}")
    print(f"  Avg Probability: {stats['avg_probability_lost']:.1f}%")
    print(f"  Avg Activities: {stats['avg_activities_lost']:.1f}")
    print("=" * 60)

    # Export to file
    generator.export_to_json(deals, 'synthetic_training_data.json')
