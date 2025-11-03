/**
 * Activity Repository
 * Data access layer for activities (emails, calls, meetings, notes)
 */

import { Activity, PrismaClient } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { PaginationParams, PaginatedResponse } from '../types';

export class ActivityRepository extends BaseRepository<Activity> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'Activity');
  }

  protected getModel() {
    return this.prisma.activity;
  }

  /**
   * Find activities by deal ID
   */
  async findByDeal(
    dealId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Activity>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { dealId },
        skip,
        take: limit,
        orderBy: pagination?.sortBy
          ? { [pagination.sortBy]: pagination.sortOrder || 'desc' }
          : { createdAt: 'desc' },
      }),
      this.prisma.activity.count({
        where: { dealId },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find activities by type
   */
  async findByType(type: string): Promise<Activity[]> {
    return this.prisma.activity.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find scheduled activities (upcoming)
   */
  async findScheduled(dealId?: string): Promise<Activity[]> {
    return this.prisma.activity.findMany({
      where: {
        dealId,
        scheduledAt: {
          gte: new Date(),
        },
        completedAt: null,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Mark activity as completed
   */
  async markCompleted(id: string): Promise<Activity> {
    return this.prisma.activity.update({
      where: { id },
      data: {
        completedAt: new Date(),
      },
    });
  }

  /**
   * Get activity count by type for a deal
   */
  async getCountByType(dealId: string): Promise<Record<string, number>> {
    const activities = await this.prisma.activity.findMany({
      where: { dealId },
      select: { type: true },
    });

    return activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
