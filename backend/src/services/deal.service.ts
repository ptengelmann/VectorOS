/**
 * Deal Service
 * Business logic for deal management with AI integration
 */

import { Deal } from '@prisma/client';
import { DealRepository } from '../repositories/deal.repository';
import { AIService } from './ai.service';
import { InsightService } from './insight.service';
import {
  CreateDealData,
  UpdateDealData,
  ServiceResponse,
  NotFoundError,
  ValidationError,
  PaginationParams,
  PaginatedResponse,
  DealStage,
} from '../types';
import { AppLogger, createLogger } from '../utils/logger';

export class DealService {
  private dealRepo: DealRepository;
  private aiService: AIService;
  private insightService: InsightService;
  private logger: AppLogger;

  constructor(
    dealRepo: DealRepository,
    aiService: AIService,
    insightService: InsightService
  ) {
    this.dealRepo = dealRepo;
    this.aiService = aiService;
    this.insightService = insightService;
    this.logger = createLogger({ service: 'DealService' });
  }

  /**
   * Get deal by ID
   */
  async getById(id: string): Promise<ServiceResponse<Deal>> {
    try {
      const deal = await this.dealRepo.findById(id);

      if (!deal) {
        throw new NotFoundError('Deal', id);
      }

      return {
        success: true,
        data: deal,
      };
    } catch (error) {
      this.logger.error('Error getting deal by ID', error as Error, { id });
      return this.handleError(error);
    }
  }

  /**
   * Get deals by workspace with pagination
   */
  async getByWorkspace(
    workspaceId: string,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<Deal>>> {
    try {
      const result = await this.dealRepo.findByWorkspace(workspaceId, pagination);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Error getting deals by workspace', error as Error, {
        workspaceId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Create new deal
   */
  async create(data: CreateDealData): Promise<ServiceResponse<Deal>> {
    try {
      // Validate data
      this.validateDealData(data);

      // Create deal
      const deal = await this.dealRepo.create(data);

      this.logger.info('Deal created', { dealId: deal.id, workspaceId: data.workspaceId });

      // Trigger AI analysis asynchronously (don't await)
      this.analyzeDealAsync(deal.id).catch(err => {
        this.logger.error('Background deal analysis failed', err);
      });

      return {
        success: true,
        data: deal,
      };
    } catch (error) {
      this.logger.error('Error creating deal', error as Error, { data });
      return this.handleError(error);
    }
  }

  /**
   * Update deal
   */
  async update(id: string, data: UpdateDealData): Promise<ServiceResponse<Deal>> {
    try {
      // Check if deal exists
      const existing = await this.dealRepo.findById(id);
      if (!existing) {
        throw new NotFoundError('Deal', id);
      }

      // Validate update data
      if (data.value !== undefined && data.value < 0) {
        throw new ValidationError('Deal value must be positive');
      }

      // Update deal
      const deal = await this.dealRepo.update(id, data);

      this.logger.info('Deal updated', { dealId: id });

      // If stage changed, trigger analysis
      if (data.stage && data.stage !== existing.stage) {
        this.handleStageChange(deal, existing.stage, data.stage).catch(err => {
          this.logger.error('Stage change handling failed', err);
        });
      }

      return {
        success: true,
        data: deal,
      };
    } catch (error) {
      this.logger.error('Error updating deal', error as Error, { id, data });
      return this.handleError(error);
    }
  }

  /**
   * Delete deal
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      const existing = await this.dealRepo.findById(id);
      if (!existing) {
        throw new NotFoundError('Deal', id);
      }

      await this.dealRepo.delete(id);

      this.logger.info('Deal deleted', { dealId: id });

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error('Error deleting deal', error as Error, { id });
      return this.handleError(error);
    }
  }

  /**
   * Get deals by stage
   */
  async getByStage(
    workspaceId: string,
    stage: DealStage
  ): Promise<ServiceResponse<Deal[]>> {
    try {
      const deals = await this.dealRepo.findByStage(workspaceId, stage);

      return {
        success: true,
        data: deals,
      };
    } catch (error) {
      this.logger.error('Error getting deals by stage', error as Error, {
        workspaceId,
        stage,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get pipeline metrics
   */
  async getPipelineMetrics(workspaceId: string): Promise<ServiceResponse<any>> {
    try {
      const metrics = await this.dealRepo.getPipelineMetrics(workspaceId);

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      this.logger.error('Error getting pipeline metrics', error as Error, {
        workspaceId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Analyze deal with AI
   */
  async analyzeDeal(id: string): Promise<ServiceResponse<any>> {
    try {
      const deal = await this.dealRepo.findById(id);
      if (!deal) {
        throw new NotFoundError('Deal', id);
      }

      this.logger.info('Starting AI deal analysis', { dealId: id });

      // Call AI service for deal intelligence
      const analysis = await this.aiService.analyzeDeal({
        dealId: id,
        workspaceId: deal.workspaceId,
        dealData: deal,
      });

      // Store insights if generated
      if (analysis.insights && analysis.insights.length > 0) {
        await this.insightService.createFromAIAnalysis(
          deal.workspaceId,
          analysis.insights
        );
      }

      this.logger.info('Deal analysis complete', {
        dealId: id,
        score: analysis.overall_score,
      });

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      this.logger.error('Error analyzing deal', error as Error, { id });
      return this.handleError(error);
    }
  }

  /**
   * Search deals
   */
  async search(workspaceId: string, query: string): Promise<ServiceResponse<Deal[]>> {
    try {
      if (!query || query.trim().length === 0) {
        throw new ValidationError('Search query cannot be empty');
      }

      const deals = await this.dealRepo.search(workspaceId, query.trim());

      return {
        success: true,
        data: deals,
      };
    } catch (error) {
      this.logger.error('Error searching deals', error as Error, {
        workspaceId,
        query,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get deals closing soon
   */
  async getClosingSoon(
    workspaceId: string,
    days: number = 30
  ): Promise<ServiceResponse<Deal[]>> {
    try {
      const deals = await this.dealRepo.findClosingSoon(workspaceId, days);

      return {
        success: true,
        data: deals,
      };
    } catch (error) {
      this.logger.error('Error getting closing soon deals', error as Error, {
        workspaceId,
        days,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get stale deals
   */
  async getStale(
    workspaceId: string,
    days: number = 14
  ): Promise<ServiceResponse<Deal[]>> {
    try {
      const deals = await this.dealRepo.findStale(workspaceId, days);

      // If we have stale deals, generate warning insights
      if (deals.length > 0) {
        this.generateStaleDealsInsight(workspaceId, deals).catch(err => {
          this.logger.error('Failed to generate stale deals insight', err);
        });
      }

      return {
        success: true,
        data: deals,
      };
    } catch (error) {
      this.logger.error('Error getting stale deals', error as Error, {
        workspaceId,
        days,
      });
      return this.handleError(error);
    }
  }

  /**
   * Assign deal to user
   */
  async assignDeal(dealId: string, userId: string): Promise<ServiceResponse<Deal>> {
    try {
      const deal = await this.dealRepo.assignToUser(dealId, userId);

      this.logger.info('Deal assigned', { dealId, userId });

      return {
        success: true,
        data: deal,
      };
    } catch (error) {
      this.logger.error('Error assigning deal', error as Error, { dealId, userId });
      return this.handleError(error);
    }
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private validateDealData(data: CreateDealData): void {
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Deal title is required');
    }

    if (data.value !== undefined && data.value < 0) {
      throw new ValidationError('Deal value must be positive');
    }

    if (data.probability !== undefined && (data.probability < 0 || data.probability > 100)) {
      throw new ValidationError('Probability must be between 0 and 100');
    }
  }

  private async analyzeDealAsync(dealId: string): Promise<void> {
    try {
      await this.analyzeDeal(dealId);
    } catch (error) {
      this.logger.error('Async deal analysis failed', error as Error, { dealId });
    }
  }

  private async handleStageChange(
    deal: Deal,
    oldStage: DealStage,
    newStage: DealStage
  ): Promise<void> {
    this.logger.info('Deal stage changed', {
      dealId: deal.id,
      oldStage,
      newStage,
    });

    // Generate insight about stage change
    if (newStage === 'won') {
      await this.insightService.createDealWonInsight(deal);
    } else if (newStage === 'lost') {
      await this.insightService.createDealLostInsight(deal);
    }

    // Trigger AI analysis on significant stage changes
    if (['proposal', 'negotiation', 'won', 'lost'].includes(newStage)) {
      await this.analyzeDealAsync(deal.id);
    }
  }

  private async generateStaleDealsInsight(
    workspaceId: string,
    deals: Deal[]
  ): Promise<void> {
    await this.insightService.createStaleDealsInsight(workspaceId, deals);
  }

  private handleError(error: unknown): ServiceResponse<never> {
    if (error instanceof NotFoundError ||
        error instanceof ValidationError) {
      return {
        success: false,
        error: {
          code: (error as any).code,
          message: error.message,
          statusCode: (error as any).statusCode,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
      },
    };
  }
}
