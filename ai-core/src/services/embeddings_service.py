"""
VectorOS Embeddings Service
Handles deal embeddings and vector search using Qdrant
"""

from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid
import logging

logger = logging.getLogger(__name__)

class EmbeddingsService:
    def __init__(self):
        """Initialize embeddings model and Qdrant client"""

        # Load sentence transformer model (384-dimensional vectors)
        logger.info("Loading sentence-transformers model...")
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

        # Initialize Qdrant in-memory for development
        # For production, use: QdrantClient(host="localhost", port=6333)
        logger.info("Initializing Qdrant client (in-memory mode)...")
        self.qdrant = QdrantClient(":memory:")

        # Create collection if it doesn't exist
        self._ensure_collection()

        logger.info("Embeddings service initialized successfully")

    def _ensure_collection(self):
        """Create deals collection if it doesn't exist"""
        collection_name = "deals"

        try:
            # Check if collection exists
            collections = self.qdrant.get_collections()
            collection_names = [c.name for c in collections.collections]

            if collection_name not in collection_names:
                logger.info(f"Creating collection: {collection_name}")
                self.qdrant.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(
                        size=384,  # all-MiniLM-L6-v2 produces 384-dim vectors
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Collection '{collection_name}' created")
            else:
                logger.info(f"Collection '{collection_name}' already exists")
        except Exception as e:
            logger.error(f"Error ensuring collection: {e}")
            raise

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text

        Args:
            text: Input text to embed

        Returns:
            384-dimensional vector
        """
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

    def embed_deal(self, deal: Dict) -> str:
        """
        Create embedding for a deal and store in Qdrant

        Args:
            deal: Deal dictionary with keys: id, title, company, stage, value, etc.

        Returns:
            Point ID (deal ID)
        """
        try:
            # Create rich text representation of deal
            deal_text = self._deal_to_text(deal)

            # Generate embedding
            vector = self.generate_embedding(deal_text)

            # Create point (Qdrant requires UUID format)
            deal_id = deal.get('id', str(uuid.uuid4()))

            # Convert to UUID if it's a string
            if isinstance(deal_id, str):
                try:
                    point_id = uuid.UUID(deal_id)
                except ValueError:
                    # If not a valid UUID, hash it to create one
                    point_id = uuid.uuid5(uuid.NAMESPACE_DNS, deal_id)
            else:
                point_id = deal_id

            point = PointStruct(
                id=str(point_id),
                vector=vector,
                payload={
                    "deal_id": deal.get('id'),
                    "title": deal.get('title'),
                    "company": deal.get('company'),
                    "value": deal.get('value', 0),
                    "stage": deal.get('stage'),
                    "probability": deal.get('probability', 0),
                    "outcome": deal.get('outcome'),  # 'won', 'lost', or None if active
                    "close_date": str(deal.get('closeDate')) if deal.get('closeDate') else None,
                    "created_at": str(deal.get('createdAt')) if deal.get('createdAt') else None,
                }
            )

            # Upsert to Qdrant
            self.qdrant.upsert(
                collection_name="deals",
                points=[point]
            )

            logger.info(f"Embedded deal: {deal.get('title')} (ID: {point_id})")
            return point_id

        except Exception as e:
            logger.error(f"Error embedding deal: {e}")
            raise

    def embed_multiple_deals(self, deals: List[Dict]) -> List[str]:
        """
        Embed multiple deals in batch

        Args:
            deals: List of deal dictionaries

        Returns:
            List of point IDs
        """
        point_ids = []

        for deal in deals:
            try:
                point_id = self.embed_deal(deal)
                point_ids.append(point_id)
            except Exception as e:
                logger.error(f"Failed to embed deal {deal.get('id')}: {e}")
                continue

        logger.info(f"Successfully embedded {len(point_ids)}/{len(deals)} deals")
        return point_ids

    def find_similar_deals(
        self,
        deal_id: Optional[str] = None,
        deal_text: Optional[str] = None,
        limit: int = 10,
        score_threshold: float = 0.7
    ) -> List[Dict]:
        """
        Find similar deals using vector search

        Args:
            deal_id: ID of deal to find similar deals for
            deal_text: Or provide text directly
            limit: Number of results to return
            score_threshold: Minimum similarity score (0-1)

        Returns:
            List of similar deals with scores
        """
        try:
            # Get query vector
            if deal_id:
                # Retrieve deal from Qdrant and use its vector
                result = self.qdrant.retrieve(
                    collection_name="deals",
                    ids=[deal_id],
                    with_vectors=True
                )
                if not result:
                    logger.warning(f"Deal {deal_id} not found in vector DB")
                    return []
                query_vector = result[0].vector
            elif deal_text:
                # Generate embedding from text
                query_vector = self.generate_embedding(deal_text)
            else:
                raise ValueError("Must provide either deal_id or deal_text")

            # Search (increase limit by 1 if searching by deal_id to exclude self)
            search_limit = limit + 1 if deal_id else limit
            search_results = self.qdrant.search(
                collection_name="deals",
                query_vector=query_vector,
                limit=search_limit,
                score_threshold=score_threshold
            )

            # Format results
            similar_deals = []
            for hit in search_results:
                # Skip the query deal itself if searching by ID
                if deal_id and hit.payload.get('deal_id') == deal_id:
                    continue

                # Stop if we've reached the limit
                if len(similar_deals) >= limit:
                    break

                similar_deals.append({
                    "deal_id": hit.payload.get('deal_id'),
                    "title": hit.payload.get('title'),
                    "company": hit.payload.get('company'),
                    "value": hit.payload.get('value'),
                    "stage": hit.payload.get('stage'),
                    "probability": hit.payload.get('probability'),
                    "outcome": hit.payload.get('outcome'),
                    "similarity_score": hit.score,
                    "close_date": hit.payload.get('close_date'),
                })

            logger.info(f"Found {len(similar_deals)} similar deals")
            return similar_deals

        except Exception as e:
            logger.error(f"Error finding similar deals: {e}")
            raise

    def get_collection_stats(self) -> Dict:
        """Get statistics about the deals collection"""
        try:
            collection_info = self.qdrant.get_collection("deals")
            return {
                "total_deals": collection_info.points_count,
                "vector_size": collection_info.config.params.vectors.size,
                "distance_metric": collection_info.config.params.vectors.distance.name,
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {}

    def _deal_to_text(self, deal: Dict) -> str:
        """
        Convert deal to rich text representation for embedding

        Creates a natural language description that captures:
        - Title and company
        - Deal value and stage
        - Probability and outcome
        """
        parts = []

        if deal.get('title'):
            parts.append(f"Deal: {deal['title']}")

        if deal.get('company'):
            parts.append(f"Company: {deal['company']}")

        if deal.get('value'):
            parts.append(f"Value: ${deal['value']:,}")

        if deal.get('stage'):
            parts.append(f"Stage: {deal['stage']}")

        if deal.get('probability'):
            parts.append(f"Probability: {deal['probability']}%")

        if deal.get('outcome'):
            parts.append(f"Outcome: {deal['outcome']}")

        if deal.get('contactName'):
            parts.append(f"Contact: {deal['contactName']}")

        # Join with periods for better semantic understanding
        return ". ".join(parts) + "."


# Singleton instance
_embeddings_service = None

def get_embeddings_service() -> EmbeddingsService:
    """Get or create embeddings service singleton"""
    global _embeddings_service
    if _embeddings_service is None:
        _embeddings_service = EmbeddingsService()
    return _embeddings_service
