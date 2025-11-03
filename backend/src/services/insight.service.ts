/**
 * Insight Service
 * Business logic for AI-generated insights
 */

import { PrismaClient, Deal, Insight } from '@prisma/client';
import { CreateInsightData, InsightType, Priority } from '../types';
import { AppLogger, createLogger } from '../utils/logger';
import { AIService } from './ai.service';

export class InsightService {
  private logger: AppLogger;
  private prisma: PrismaClient;
  private aiService: AIService;

  constructor(prisma: PrismaClient, aiService: AIService) {
    this.logger = createLogger({ service: 'InsightService' });
    this.prisma = prisma;
    this.aiService = aiService;
  }

  /**
   * Generate insights for a workspace by analyzing all deals
   */
  async generateWorkspaceInsights(workspaceId: string): Promise<Insight[]> {
    this.logger.info('Generating workspace insights', { workspaceId });

    try {
      // Get all deals for the workspace
      const deals = await this.prisma.deal.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
      });

      if (deals.length === 0) {
        this.logger.info('No deals found for workspace', { workspaceId });
        return [];
      }

      // Call AI Core to analyze deals
      const aiInsights = await this.aiService.analyzeWorkspace(deals);

      // Save insights to database
      const savedInsights = await Promise.all(
        aiInsights.map((insight: any) =>
          this.prisma.insight.create({
            data: {
              workspaceId,
              type: insight.type || 'recommendation',
              title: insight.title,
              description: insight.description,
              priority: insight.priority || 'medium',
              confidence: insight.confidence || 0.8,
              data: insight.data || {},
              actions: insight.actions || {},
              status: 'new',
            },
          })
        )
      );

      this.logger.info('Workspace insights generated', {
        workspaceId,
        count: savedInsights.length,
      });

      return savedInsights;
    } catch (error) {
      this.logger.error('Failed to generate workspace insights', error as Error, {
        workspaceId,
      });
      throw error;
    }
  }

  /**
   * Get all insights for a workspace
   */
  async getWorkspaceInsights(workspaceId: string): Promise<Insight[]> {
    return this.prisma.insight.findMany({
      where: { workspaceId },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Mark insight as viewed
   */
  async markAsViewed(insightId: string): Promise<Insight> {
    return this.prisma.insight.update({
      where: { id: insightId },
      data: { status: 'viewed' },
    });
  }

  /**
   * Mark insight as actioned
   */
  async markAsActioned(insightId: string): Promise<Insight> {
    return this.prisma.insight.update({
      where: { id: insightId },
      data: { status: 'actioned' },
    });
  }

  /**
   * Dismiss an insight
   */
  async dismissInsight(insightId: string): Promise<Insight> {
    return this.prisma.insight.update({
      where: { id: insightId },
      data: { status: 'dismissed' },
    });
  }

  async createFromAIAnalysis(workspaceId: string, insights: any[]): Promise<void> {
    this.logger.info('Creating insights from AI analysis', {
      workspaceId,
      count: insights.length,
    });
    // Implementation would save to database
  }

  async createDealWonInsight(deal: Deal): Promise<void> {
    this.logger.info('Creating deal won insight', { dealId: deal.id });
    // Implementation would create insight
  }

  async createDealLostInsight(deal: Deal): Promise<void> {
    this.logger.info('Creating deal lost insight', { dealId: deal.id });
    // Implementation would create insight
  }

  async createStaleDealsInsight(workspaceId: string, deals: Deal[]): Promise<void> {
    this.logger.info('Creating stale deals insight', {
      workspaceId,
      count: deals.length,
    });
    // Implementation would create insight
  }
}
