/**
 * Workspace Service
 * Business logic layer for workspace operations
 */

import { Workspace } from '@prisma/client';
import { WorkspaceRepository, CreateWorkspaceInput, UpdateWorkspaceInput } from '../repositories/workspace.repository';
import { AppError, ServiceResult } from '../types';
import { logger } from '../utils/logger';

export interface CreateWorkspaceDTO {
  name: string;
  slug?: string;
  ownerId: string;
  tier?: string;
}

export interface UpdateWorkspaceDTO {
  name?: string;
  slug?: string;
  tier?: string;
}

export class WorkspaceService {
  constructor(private workspaceRepository: WorkspaceRepository) {}

  /**
   * Generate a unique slug from workspace name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  /**
   * Ensure slug is unique by appending numbers if needed
   */
  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await this.workspaceRepository.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Get workspace by ID
   */
  async getById(id: string): Promise<ServiceResult<Workspace>> {
    try {
      const workspace = await this.workspaceRepository.findById(id);

      if (!workspace) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workspace not found',
            statusCode: 404,
          },
        };
      }

      return {
        success: true,
        data: workspace,
      };
    } catch (error) {
      logger.error('Failed to get workspace', { id, error });
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve workspace',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get workspace by slug
   */
  async getBySlug(slug: string): Promise<ServiceResult<Workspace>> {
    try {
      const workspace = await this.workspaceRepository.findBySlug(slug);

      if (!workspace) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workspace not found',
            statusCode: 404,
          },
        };
      }

      return {
        success: true,
        data: workspace,
      };
    } catch (error) {
      logger.error('Failed to get workspace by slug', { slug, error });
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve workspace',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get all workspaces for a user (owned or member)
   */
  async getByUserId(userId: string): Promise<ServiceResult<Workspace[]>> {
    try {
      const workspaces = await this.workspaceRepository.findByUserId(userId);

      return {
        success: true,
        data: workspaces,
      };
    } catch (error) {
      logger.error('Failed to get user workspaces', { userId, error });
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve workspaces',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Create a new workspace
   */
  async create(data: CreateWorkspaceDTO): Promise<ServiceResult<Workspace>> {
    try {
      // Validate input
      if (!data.name || data.name.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Workspace name is required',
            statusCode: 400,
          },
        };
      }

      if (!data.ownerId) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Owner ID is required',
            statusCode: 400,
          },
        };
      }

      // Generate or ensure unique slug
      let slug = data.slug || this.generateSlug(data.name);
      slug = await this.ensureUniqueSlug(slug);

      // Create workspace
      const workspace = await this.workspaceRepository.create({
        name: data.name.trim(),
        slug,
        ownerId: data.ownerId,
        tier: data.tier || 'starter',
      });

      console.log('Workspace created:', workspace.id);

      return {
        success: true,
        data: workspace,
      };
    } catch (error) {
      console.error('Failed to create workspace:', error);

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create workspace',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Update workspace
   */
  async update(id: string, userId: string, data: UpdateWorkspaceDTO): Promise<ServiceResult<Workspace>> {
    try {
      // Check if workspace exists and user has permission
      const workspace = await this.workspaceRepository.findById(id);

      if (!workspace) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workspace not found',
            statusCode: 404,
          },
        };
      }

      // Check permission (owner or admin)
      const isOwner = await this.workspaceRepository.isOwner(id, userId);
      const memberRole = await this.workspaceRepository.getMemberRole(id, userId);
      const canUpdate = isOwner || memberRole === 'admin';

      if (!canUpdate) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this workspace',
            statusCode: 403,
          },
        };
      }

      // If slug is being updated, ensure uniqueness
      if (data.slug && data.slug !== workspace.slug) {
        data.slug = await this.ensureUniqueSlug(this.generateSlug(data.slug));
      }

      // Update workspace
      const updated = await this.workspaceRepository.update(id, data);

      logger.info('Workspace updated', {
        workspaceId: id,
        userId,
        changes: Object.keys(data),
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      logger.error('Failed to update workspace', { id, data, error });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update workspace',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Delete workspace (owner only)
   */
  async delete(id: string, userId: string): Promise<ServiceResult<void>> {
    try {
      // Check if workspace exists
      const workspace = await this.workspaceRepository.findById(id);

      if (!workspace) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workspace not found',
            statusCode: 404,
          },
        };
      }

      // Only owner can delete
      if (workspace.ownerId !== userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only workspace owner can delete the workspace',
            statusCode: 403,
          },
        };
      }

      // Delete workspace (will cascade to deals, members, etc.)
      await this.workspaceRepository.delete(id);

      logger.info('Workspace deleted', { workspaceId: id, userId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to delete workspace', { id, userId, error });
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete workspace',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Add member to workspace
   */
  async addMember(
    workspaceId: string,
    requesterId: string,
    userId: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<ServiceResult<void>> {
    try {
      // Check permission
      const isOwner = await this.workspaceRepository.isOwner(workspaceId, requesterId);
      const requesterRole = await this.workspaceRepository.getMemberRole(workspaceId, requesterId);
      const canAddMember = isOwner || requesterRole === 'admin';

      if (!canAddMember) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to add members',
            statusCode: 403,
          },
        };
      }

      // Add member
      await this.workspaceRepository.addMember(workspaceId, userId, role);

      logger.info('Member added to workspace', {
        workspaceId,
        userId,
        role,
        addedBy: requesterId,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to add member', { workspaceId, userId, error });
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to add member to workspace',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Remove member from workspace
   */
  async removeMember(
    workspaceId: string,
    requesterId: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    try {
      // Check permission
      const isOwner = await this.workspaceRepository.isOwner(workspaceId, requesterId);
      const requesterRole = await this.workspaceRepository.getMemberRole(workspaceId, requesterId);
      const canRemoveMember = isOwner || requesterRole === 'admin' || requesterId === userId;

      if (!canRemoveMember) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to remove this member',
            statusCode: 403,
          },
        };
      }

      // Cannot remove owner
      if (await this.workspaceRepository.isOwner(workspaceId, userId)) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot remove workspace owner',
            statusCode: 400,
          },
        };
      }

      // Remove member
      await this.workspaceRepository.removeMember(workspaceId, userId);

      logger.info('Member removed from workspace', {
        workspaceId,
        userId,
        removedBy: requesterId,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to remove member', { workspaceId, userId, error });
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to remove member from workspace',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Check if user has access to workspace
   */
  async checkAccess(workspaceId: string, userId: string): Promise<boolean> {
    try {
      return await this.workspaceRepository.hasAccess(workspaceId, userId);
    } catch (error) {
      logger.error('Failed to check workspace access', { workspaceId, userId, error });
      return false;
    }
  }
}
