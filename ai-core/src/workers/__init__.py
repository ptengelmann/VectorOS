"""
VectorOS Workers Module
Background workers for autonomous monitoring and processing
"""

from .deal_monitor import DealMonitor

__all__ = ["DealMonitor"]
