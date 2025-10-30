/**
 * Base Repository
 * Abstract repository providing common CRUD operations with Prisma
 */

import { PrismaClient } from '@prisma/client';
import { FindOptions, Repository } from '../types';
import { AppLogger, createLogger } from '../utils/logger';

export abstract class BaseRepository<T> implements Repository<T> {
  protected prisma: PrismaClient;
  protected logger: AppLogger;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
    this.logger = createLogger({ repository: modelName });
  }

  /**
   * Get Prisma model delegate
   */
  protected abstract getModel(): any;

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Finding ${this.modelName} by ID`, { id });

      const model = this.getModel();
      const result = await model.findUnique({
        where: { id },
      });

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('findById', this.modelName, duration, {
        id,
        found: !!result,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error finding ${this.modelName} by ID`, error as Error, { id });
      throw error;
    }
  }

  /**
   * Find many entities
   */
  async findMany(options?: FindOptions): Promise<T[]> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Finding multiple ${this.modelName}`, options);

      const model = this.getModel();
      const results = await model.findMany(options);

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('findMany', this.modelName, duration, {
        count: results.length,
        options,
      });

      return results;
    } catch (error) {
      this.logger.error(`Error finding ${this.modelName}`, error as Error, { options });
      throw error;
    }
  }

  /**
   * Find first entity matching criteria
   */
  async findFirst(options?: FindOptions): Promise<T | null> {
    const startTime = Date.now();

    try {
      const model = this.getModel();
      const result = await model.findFirst(options);

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('findFirst', this.modelName, duration, {
        found: !!result,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error finding first ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Create entity
   */
  async create(data: any): Promise<T> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Creating ${this.modelName}`, { data });

      const model = this.getModel();
      const result = await model.create({
        data,
      });

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('create', this.modelName, duration, {
        id: result.id,
      });

      this.logger.info(`${this.modelName} created`, { id: result.id });

      return result;
    } catch (error) {
      this.logger.error(`Error creating ${this.modelName}`, error as Error, { data });
      throw error;
    }
  }

  /**
   * Update entity
   */
  async update(id: string, data: any): Promise<T> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Updating ${this.modelName}`, { id, data });

      const model = this.getModel();
      const result = await model.update({
        where: { id },
        data,
      });

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('update', this.modelName, duration, { id });

      this.logger.info(`${this.modelName} updated`, { id });

      return result;
    } catch (error) {
      this.logger.error(`Error updating ${this.modelName}`, error as Error, { id, data });
      throw error;
    }
  }

  /**
   * Delete entity
   */
  async delete(id: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Deleting ${this.modelName}`, { id });

      const model = this.getModel();
      await model.delete({
        where: { id },
      });

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('delete', this.modelName, duration, { id });

      this.logger.info(`${this.modelName} deleted`, { id });
    } catch (error) {
      this.logger.error(`Error deleting ${this.modelName}`, error as Error, { id });
      throw error;
    }
  }

  /**
   * Count entities
   */
  async count(where?: any): Promise<number> {
    const startTime = Date.now();

    try {
      const model = this.getModel();
      const count = await model.count({ where });

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('count', this.modelName, duration, { count });

      return count;
    } catch (error) {
      this.logger.error(`Error counting ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== null;
  }

  /**
   * Upsert (create or update)
   */
  async upsert(where: any, create: any, update: any): Promise<T> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Upserting ${this.modelName}`, { where, create, update });

      const model = this.getModel();
      const result = await model.upsert({
        where,
        create,
        update,
      });

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('upsert', this.modelName, duration, {
        id: result.id,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error upserting ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Batch create
   */
  async createMany(data: any[]): Promise<number> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Batch creating ${this.modelName}`, { count: data.length });

      const model = this.getModel();
      const result = await model.createMany({
        data,
        skipDuplicates: true,
      });

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('createMany', this.modelName, duration, {
        count: result.count,
      });

      return result.count;
    } catch (error) {
      this.logger.error(`Error batch creating ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Batch delete
   */
  async deleteMany(where: any): Promise<number> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Batch deleting ${this.modelName}`, { where });

      const model = this.getModel();
      const result = await model.deleteMany({ where });

      const duration = Date.now() - startTime;
      this.logger.logDbOperation('deleteMany', this.modelName, duration, {
        count: result.count,
      });

      return result.count;
    } catch (error) {
      this.logger.error(`Error batch deleting ${this.modelName}`, error as Error);
      throw error;
    }
  }
}
