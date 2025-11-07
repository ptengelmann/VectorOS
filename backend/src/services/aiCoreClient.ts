/**
 * AI Core Client Service
 * Handles communication with the AI Core API for embeddings and ML features
 */

import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

const AI_CORE_URL = process.env.AI_CORE_URL || 'http://localhost:8000';

interface EmbedDealResponse {
  success: boolean;
  point_id: string;
  message: string;
}

interface EmbedMultipleDealsResponse {
  success: boolean;
  embedded_count: number;
  point_ids: string[];
  message: string;
}

interface Deal {
  id: string;
  title: string;
  company?: string | null;
  value?: number | null;
  stage?: string | null;
  probability?: number | null;
  contactName?: string | null;
  closeDate?: Date | null;
  createdAt?: Date;
}

class AICoreClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: AI_CORE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info(`AI Core client initialized: ${AI_CORE_URL}`);
  }

  /**
   * Embed a single deal in the vector database
   */
  async embedDeal(deal: Deal): Promise<string | null> {
    try {
      const response = await this.client.post<EmbedDealResponse>(
        '/api/v1/embeddings/embed-deal',
        { deal }
      );

      if (response.data.success) {
        logger.info(`Deal embedded successfully: ${deal.id}`);
        return response.data.point_id;
      }

      logger.warn(`Failed to embed deal: ${deal.id}`);
      return null;
    } catch (error) {
      logger.error(`Error embedding deal ${deal.id}:`, error);
      return null;
    }
  }

  /**
   * Embed multiple deals in batch
   */
  async embedMultipleDeals(deals: Deal[]): Promise<string[]> {
    try {
      const response = await this.client.post<EmbedMultipleDealsResponse>(
        '/api/v1/embeddings/embed-multiple',
        { deals }
      );

      if (response.data.success) {
        logger.info(
          `Successfully embedded ${response.data.embedded_count}/${deals.length} deals`
        );
        return response.data.point_ids;
      }

      logger.warn(`Failed to embed deals batch`);
      return [];
    } catch (error) {
      logger.error(`Error embedding multiple deals:`, error);
      return [];
    }
  }

  /**
   * Check if AI Core is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      logger.error('AI Core health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const aiCoreClient = new AICoreClient();
