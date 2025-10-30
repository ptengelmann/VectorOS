/**
 * Deal Repository
 * Data access layer for Deal entities
 */

import { Deal, PrismaClient } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { DealStage, PaginationParams, PaginatedResponse } from '../types';

export class DealRepository extends BaseRepository<Deal> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'Deal');
  }

  protected getModel() {
    return this.prisma.deal;
  }

  /**
   * Find deals by workspace
   */
  async findByWorkspace(
    workspaceId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Deal>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.deal.findMany({
        where: { workspaceId },
        skip,
        take: limit,
        orderBy: pagination?.sortBy
          ? { [pagination.sortBy]: pagination.sortOrder || 'desc' }
          : { createdAt: 'desc' },
        include: {
          assignedTo: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          activities: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.count({ workspaceId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Find deals by stage
   */
  async findByStage(workspaceId: string, stage: DealStage): Promise<Deal[]> {
    return this.findMany({
      where: {
        workspaceId,
        stage,
      },
      include: {
        assignedTo: true,
      },
      orderBy: {
        value: 'desc',
      },
    });
  }

  /**
   * Find deals assigned to user
   */
  async findByAssignee(userId: string): Promise<Deal[]> {
    return this.findMany({
      where: {
        assignedToId: userId,
      },
      orderBy: {
        closeDate: 'asc',
      },
    });
  }

  /**
   * Find deals closing soon
   */
  async findClosingSoon(workspaceId: string, days: number = 30): Promise<Deal[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.findMany({
      where: {
        workspaceId,
        closeDate: {
          lte: futureDate,
          gte: new Date(),
        },
        stage: {
          notIn: ['won', 'lost'],
        },
      },
      orderBy: {
        closeDate: 'asc',
      },
    });
  }

  /**
   * Find stale deals (no activity for X days)
   */
  async findStale(workspaceId: string, days: number = 14): Promise<Deal[]> {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    return this.findMany({
      where: {
        workspaceId,
        updatedAt: {
          lte: pastDate,
        },
        stage: {
          notIn: ['won', 'lost'],
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
  }

  /**
   * Get pipeline metrics
   */
  async getPipelineMetrics(workspaceId: string) {
    const deals = await this.findMany({
      where: { workspaceId },
    });

    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const weightedValue = deals.reduce(
      (sum, deal) => sum + (deal.value || 0) * ((deal.probability || 50) / 100),
      0
    );

    const stageDistribution = deals.reduce((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const wonDeals = deals.filter(d => d.stage === 'won').length;
    const conversionRate = totalDeals > 0 ? wonDeals / totalDeals : 0;

    return {
      totalDeals,
      totalValue,
      weightedValue,
      averageDealSize: totalDeals > 0 ? totalValue / totalDeals : 0,
      stageDistribution,
      conversionRate,
    };
  }

  /**
   * Search deals
   */
  async search(workspaceId: string, query: string): Promise<Deal[]> {
    return this.findMany({
      where: {
        workspaceId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { contactName: { contains: query, mode: 'insensitive' } },
          { contactEmail: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }

  /**
   * Update deal stage
   */
  async updateStage(id: string, stage: DealStage): Promise<Deal> {
    return this.update(id, { stage });
  }

  /**
   * Assign deal to user
   */
  async assignToUser(id: string, userId: string): Promise<Deal> {
    return this.update(id, { assignedToId: userId });
  }
}
