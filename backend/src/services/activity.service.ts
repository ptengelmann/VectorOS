/**
 * Activity Service
 * Business logic for activity management (emails, calls, meetings, notes)
 */

import { Activity } from '@prisma/client';
import { ActivityRepository } from '../repositories/activity.repository';
import {
  ServiceResponse,
  NotFoundError,
  ValidationError,
  PaginationParams,
  PaginatedResponse,
} from '../types';
import { AppLogger, createLogger } from '../utils/logger';

export interface CreateActivityData {
  type: string; // email, call, meeting, note
  subject?: string;
  content?: string;
  scheduledAt?: Date | string;
  completedAt?: Date | string;
  dealId: string;
}

export interface UpdateActivityData {
  type?: string;
  subject?: string;
  content?: string;
  scheduledAt?: Date | string;
  completedAt?: Date | string;
}

export class ActivityService {
  private activityRepo: ActivityRepository;
  private logger: AppLogger;

  constructor(activityRepo: ActivityRepository) {
    this.activityRepo = activityRepo;
    this.logger = createLogger({ service: 'ActivityService' });
  }

  /**
   * Get activity by ID
   */
  async getById(id: string): Promise<ServiceResponse<Activity>> {
    try {
      const activity = await this.activityRepo.findById(id);

      if (!activity) {
        throw new NotFoundError('Activity', id);
      }

      return {
        success: true,
        data: activity,
      };
    } catch (error) {
      this.logger.error('Error getting activity by ID', error as Error, { id });
      return this.handleError(error);
    }
  }

  /**
   * Get activities by deal ID
   */
  async getByDeal(
    dealId: string,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<Activity>>> {
    try {
      const result = await this.activityRepo.findByDeal(dealId, pagination);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Error getting activities by deal', error as Error, {
        dealId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Create new activity
   */
  async create(data: CreateActivityData): Promise<ServiceResponse<Activity>> {
    try {
      // Validate data
      this.validateActivityData(data);

      // Convert string dates to Date objects if needed
      const activityData = {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      };

      // Create activity
      const activity = await this.activityRepo.create(activityData);

      this.logger.info('Activity created', {
        activityId: activity.id,
        dealId: data.dealId,
        type: data.type,
      });

      return {
        success: true,
        data: activity,
      };
    } catch (error) {
      this.logger.error('Error creating activity', error as Error, { data });
      return this.handleError(error);
    }
  }

  /**
   * Update activity
   */
  async update(id: string, data: UpdateActivityData): Promise<ServiceResponse<Activity>> {
    try {
      // Check if activity exists
      const exists = await this.activityRepo.exists(id);
      if (!exists) {
        throw new NotFoundError('Activity', id);
      }

      // Convert string dates to Date objects if needed
      const updateData = {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      };

      // Update activity
      const activity = await this.activityRepo.update(id, updateData);

      this.logger.info('Activity updated', { activityId: id });

      return {
        success: true,
        data: activity,
      };
    } catch (error) {
      this.logger.error('Error updating activity', error as Error, { id, data });
      return this.handleError(error);
    }
  }

  /**
   * Delete activity
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      // Check if activity exists
      const exists = await this.activityRepo.exists(id);
      if (!exists) {
        throw new NotFoundError('Activity', id);
      }

      // Delete activity
      await this.activityRepo.delete(id);

      this.logger.info('Activity deleted', { activityId: id });

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error('Error deleting activity', error as Error, { id });
      return this.handleError(error);
    }
  }

  /**
   * Mark activity as completed
   */
  async markCompleted(id: string): Promise<ServiceResponse<Activity>> {
    try {
      const activity = await this.activityRepo.markCompleted(id);

      this.logger.info('Activity marked as completed', { activityId: id });

      return {
        success: true,
        data: activity,
      };
    } catch (error) {
      this.logger.error('Error marking activity as completed', error as Error, { id });
      return this.handleError(error);
    }
  }

  /**
   * Get scheduled activities
   */
  async getScheduled(dealId?: string): Promise<ServiceResponse<Activity[]>> {
    try {
      const activities = await this.activityRepo.findScheduled(dealId);

      return {
        success: true,
        data: activities,
      };
    } catch (error) {
      this.logger.error('Error getting scheduled activities', error as Error);
      return this.handleError(error);
    }
  }

  /**
   * Get activity count by type
   */
  async getCountByType(dealId: string): Promise<ServiceResponse<Record<string, number>>> {
    try {
      const counts = await this.activityRepo.getCountByType(dealId);

      return {
        success: true,
        data: counts,
      };
    } catch (error) {
      this.logger.error('Error getting activity counts', error as Error, { dealId });
      return this.handleError(error);
    }
  }

  /**
   * Validate activity data
   */
  private validateActivityData(data: CreateActivityData): void {
    if (!data.type) {
      throw new ValidationError('Activity type is required');
    }

    const validTypes = ['email', 'call', 'meeting', 'note'];
    if (!validTypes.includes(data.type)) {
      throw new ValidationError(
        `Invalid activity type. Must be one of: ${validTypes.join(', ')}`
      );
    }

    if (!data.dealId) {
      throw new ValidationError('Deal ID is required');
    }

    if (data.scheduledAt && data.completedAt) {
      const scheduled = new Date(data.scheduledAt);
      const completed = new Date(data.completedAt);

      if (completed < scheduled) {
        throw new ValidationError('Completed date cannot be before scheduled date');
      }
    }
  }

  /**
   * Handle service errors
   */
  private handleError(error: unknown): ServiceResponse<never> {
    if (
      error instanceof NotFoundError ||
      error instanceof ValidationError
    ) {
      return {
        success: false,
        error: {
          code: error.name,
          message: error.message,
          statusCode: error.statusCode,
        },
      };
    }

    // Unknown error
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
