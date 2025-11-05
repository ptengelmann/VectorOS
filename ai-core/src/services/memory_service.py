"""
Memory Service - Vector Database Integration
Enables VectorOS to remember past deals, learn from outcomes, and find similar patterns.

This is the foundation of the AI brain - it provides semantic memory and retrieval.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from sentence_transformers import SentenceTransformer

from ..config import settings

logger = logging.getLogger(__name__)


class MemoryService:
    """
    Vector database service for storing and retrieving deal memories.

    This service:
    1. Generates embeddings for deals using sentence transformers
    2. Stores embeddings in Qdrant vector database
    3. Performs semantic search to find similar deals
    4. Tracks deal outcomes for learning
    """

    COLLECTION_NAME = "deal_memories"
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Fast, efficient, 384 dimensions

    def __init__(self):
        """Initialize memory service with Qdrant client and embedding model."""
        try:
            # Initialize Qdrant client (in-memory for development, can switch to server)
            self.client = QdrantClient(":memory:")  # For development
            # For production: self.client = QdrantClient(host="localhost", port=6333)

            # Initialize embedding model
            logger.info(f"Loading embedding model: {self.EMBEDDING_MODEL}")
            self.embedding_model = SentenceTransformer(self.EMBEDDING_MODEL)

            # Create collection if it doesn't exist
            self._ensure_collection_exists()

            logger.info("Memory service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize memory service: {e}")
            raise

    def _ensure_collection_exists(self):
        """Create the deal memories collection if it doesn't exist."""
        try:
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]

            if self.COLLECTION_NAME not in collection_names:
                logger.info(f"Creating collection: {self.COLLECTION_NAME}")

                self.client.create_collection(
                    collection_name=self.COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=384,  # Dimension of all-MiniLM-L6-v2
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"Collection {self.COLLECTION_NAME} created successfully")
            else:
                logger.info(f"Collection {self.COLLECTION_NAME} already exists")

        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            raise

    def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text using sentence transformers.

        Args:
            text: Input text to embed

        Returns:
            384-dimensional embedding vector
        """
        try:
            embedding = self.embedding_model.encode(text, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise

    def _deal_to_text(self, deal: Dict[str, Any]) -> str:
        """
        Convert deal data to searchable text representation.

        This creates a rich semantic representation of the deal for embedding.
        """
        parts = []

        # Company and contact info
        if deal.get("companyName"):
            parts.append(f"Company: {deal['companyName']}")
        if deal.get("contactName"):
            parts.append(f"Contact: {deal['contactName']}")

        # Deal details
        if deal.get("title"):
            parts.append(f"Deal: {deal['title']}")
        if deal.get("description"):
            parts.append(f"Description: {deal['description']}")
        if deal.get("stage"):
            parts.append(f"Stage: {deal['stage']}")
        if deal.get("source"):
            parts.append(f"Source: {deal['source']}")

        # Financial info
        if deal.get("value"):
            parts.append(f"Value: ${deal['value']}")
        if deal.get("currency"):
            parts.append(f"Currency: {deal['currency']}")

        # Additional context
        if deal.get("tags"):
            parts.append(f"Tags: {', '.join(deal['tags'])}")
        if deal.get("customFields"):
            for key, value in deal['customFields'].items():
                parts.append(f"{key}: {value}")

        return " | ".join(parts)

    async def store_deal(
        self,
        deal_id: str,
        deal: Dict[str, Any],
        workspace_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Store a deal in vector memory.

        Args:
            deal_id: Unique deal identifier
            deal: Deal data dictionary
            workspace_id: Workspace the deal belongs to
            metadata: Additional metadata (outcome, tags, etc.)

        Returns:
            True if successfully stored
        """
        try:
            # Generate text representation
            deal_text = self._deal_to_text(deal)

            # Generate embedding
            embedding = self._generate_embedding(deal_text)

            # Prepare metadata payload
            payload = {
                "deal_id": deal_id,
                "workspace_id": workspace_id,
                "company_name": deal.get("companyName", ""),
                "title": deal.get("title", ""),
                "stage": deal.get("stage", ""),
                "value": deal.get("value", 0),
                "source": deal.get("source", ""),
                "stored_at": datetime.utcnow().isoformat(),
                "deal_data": deal,  # Store full deal for retrieval
            }

            # Add custom metadata
            if metadata:
                payload.update(metadata)

            # Store in Qdrant
            self.client.upsert(
                collection_name=self.COLLECTION_NAME,
                points=[
                    PointStruct(
                        id=deal_id,
                        vector=embedding,
                        payload=payload,
                    )
                ],
            )

            logger.info(f"Stored deal {deal_id} in memory")
            return True

        except Exception as e:
            logger.error(f"Failed to store deal {deal_id}: {e}")
            return False

    async def find_similar_deals(
        self,
        deal: Dict[str, Any],
        workspace_id: str,
        top_k: int = 5,
        min_score: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """
        Find similar deals using semantic search.

        Args:
            deal: Deal to find similar deals for
            workspace_id: Workspace to search within
            top_k: Number of similar deals to return
            min_score: Minimum similarity score (0-1)

        Returns:
            List of similar deals with similarity scores
        """
        try:
            # Generate text and embedding for query deal
            deal_text = self._deal_to_text(deal)
            query_embedding = self._generate_embedding(deal_text)

            # Search with workspace filter
            results = self.client.search(
                collection_name=self.COLLECTION_NAME,
                query_vector=query_embedding,
                query_filter=Filter(
                    must=[
                        FieldCondition(
                            key="workspace_id",
                            match=MatchValue(value=workspace_id),
                        )
                    ]
                ),
                limit=top_k,
                score_threshold=min_score,
            )

            # Format results
            similar_deals = []
            for result in results:
                similar_deals.append({
                    "deal_id": result.payload.get("deal_id"),
                    "similarity_score": result.score,
                    "company_name": result.payload.get("company_name"),
                    "title": result.payload.get("title"),
                    "stage": result.payload.get("stage"),
                    "value": result.payload.get("value"),
                    "source": result.payload.get("source"),
                    "deal_data": result.payload.get("deal_data"),
                    "stored_at": result.payload.get("stored_at"),
                })

            logger.info(f"Found {len(similar_deals)} similar deals")
            return similar_deals

        except Exception as e:
            logger.error(f"Failed to find similar deals: {e}")
            return []

    async def update_deal_outcome(
        self,
        deal_id: str,
        outcome: str,
        outcome_value: Optional[float] = None,
        outcome_metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Update deal outcome for learning from results.

        Args:
            deal_id: Deal identifier
            outcome: Outcome status (won, lost, abandoned)
            outcome_value: Final deal value
            outcome_metadata: Additional outcome data

        Returns:
            True if successfully updated
        """
        try:
            # Retrieve existing point
            point = self.client.retrieve(
                collection_name=self.COLLECTION_NAME,
                ids=[deal_id],
            )

            if not point:
                logger.warning(f"Deal {deal_id} not found in memory")
                return False

            # Update payload with outcome
            payload = point[0].payload
            payload["outcome"] = outcome
            payload["outcome_date"] = datetime.utcnow().isoformat()

            if outcome_value is not None:
                payload["outcome_value"] = outcome_value

            if outcome_metadata:
                payload["outcome_metadata"] = outcome_metadata

            # Update in Qdrant
            self.client.set_payload(
                collection_name=self.COLLECTION_NAME,
                payload=payload,
                points=[deal_id],
            )

            logger.info(f"Updated outcome for deal {deal_id}: {outcome}")
            return True

        except Exception as e:
            logger.error(f"Failed to update deal outcome: {e}")
            return False

    async def get_deal_memory(self, deal_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific deal from memory.

        Args:
            deal_id: Deal identifier

        Returns:
            Deal data if found, None otherwise
        """
        try:
            points = self.client.retrieve(
                collection_name=self.COLLECTION_NAME,
                ids=[deal_id],
            )

            if points:
                return points[0].payload

            return None

        except Exception as e:
            logger.error(f"Failed to retrieve deal {deal_id}: {e}")
            return None

    async def get_workspace_stats(self, workspace_id: str) -> Dict[str, Any]:
        """
        Get memory statistics for a workspace.

        Args:
            workspace_id: Workspace identifier

        Returns:
            Statistics about stored deals
        """
        try:
            # Get all deals for workspace
            results = self.client.scroll(
                collection_name=self.COLLECTION_NAME,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="workspace_id",
                            match=MatchValue(value=workspace_id),
                        )
                    ]
                ),
                limit=1000,  # Adjust as needed
            )

            deals = results[0] if results else []

            # Calculate statistics
            total_deals = len(deals)
            won_deals = sum(1 for d in deals if d.payload.get("outcome") == "won")
            lost_deals = sum(1 for d in deals if d.payload.get("outcome") == "lost")
            active_deals = sum(1 for d in deals if not d.payload.get("outcome"))

            total_value = sum(d.payload.get("value", 0) for d in deals)

            return {
                "total_deals": total_deals,
                "active_deals": active_deals,
                "won_deals": won_deals,
                "lost_deals": lost_deals,
                "total_value": total_value,
                "win_rate": won_deals / (won_deals + lost_deals) if (won_deals + lost_deals) > 0 else 0,
            }

        except Exception as e:
            logger.error(f"Failed to get workspace stats: {e}")
            return {
                "total_deals": 0,
                "active_deals": 0,
                "won_deals": 0,
                "lost_deals": 0,
                "total_value": 0,
                "win_rate": 0,
            }


# Singleton instance
_memory_service: Optional[MemoryService] = None


def get_memory_service() -> MemoryService:
    """Get or create the memory service singleton."""
    global _memory_service
    if _memory_service is None:
        _memory_service = MemoryService()
    return _memory_service
