/**
 * Workspace Repository
 * Data access layer for workspace operations
 */

import { PrismaClient, Workspace } from '@prisma/client';
import { AppError } from '../types';

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  ownerId: string;
  tier?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
  tier?: string;
}

export class WorkspaceRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            deals: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { slug },
    });
  }

  async findByOwnerId(ownerId: string): Promise<Workspace[]> {
    return this.prisma.workspace.findMany({
      where: { ownerId },
      include: {
        _count: {
          select: {
            deals: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserId(userId: string): Promise<Workspace[]> {
    // For now, just find workspaces owned by the user
    // TODO: Add WorkspaceMember model and relation to support team workspaces
    return this.prisma.workspace.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateWorkspaceInput): Promise<Workspace> {
    // Check if slug already exists
    const existing = await this.findBySlug(data.slug);
    if (existing) {
      throw new AppError('VALIDATION_ERROR', 'Workspace slug already exists', 400);
    }

    return this.prisma.workspace.create({
      data: {
        name: data.name,
        slug: data.slug,
        ownerId: data.ownerId,
        tier: data.tier || 'starter',
      },
    });
  }

  async update(id: string, data: UpdateWorkspaceInput): Promise<Workspace> {
    // If slug is being updated, check uniqueness
    if (data.slug) {
      const existing = await this.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new AppError('VALIDATION_ERROR', 'Workspace slug already exists', 400);
      }
    }

    return this.prisma.workspace.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.tier && { tier: data.tier }),
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workspace.delete({
      where: { id },
    });
  }

  // TODO: Implement WorkspaceMember model and relations
  async addMember(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member' = 'member'
  ): Promise<void> {
    throw new Error('WorkspaceMember functionality not yet implemented');
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    throw new Error('WorkspaceMember functionality not yet implemented');
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member'
  ): Promise<void> {
    throw new Error('WorkspaceMember functionality not yet implemented');
  }

  async getMemberRole(workspaceId: string, userId: string): Promise<string | null> {
    // For now, return null (no member role)
    return null;
  }

  async isOwner(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    return workspace?.ownerId === userId;
  }

  async hasAccess(workspaceId: string, userId: string): Promise<boolean> {
    // For now, only owner has access (no member support yet)
    return await this.isOwner(workspaceId, userId);
  }
}
