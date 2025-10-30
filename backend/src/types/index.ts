/**
 * Enterprise Type Definitions
 * Centralized types for type safety across the backend
 */

import { Request } from 'express';
import { User, Workspace } from '@prisma/client';

// ============================================================================
// Authentication
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    workspaceId?: string;
    role: UserRole;
  };
  workspace?: {
    id: string;
    tier: WorkspaceTier;
  };
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

export enum WorkspaceTier {
  STARTER = 'starter',
  PRO = 'pro',
  SCALE = 'scale',
  ENTERPRISE = 'enterprise',
}

// ============================================================================
// Domain Types
// ============================================================================

export enum DealStage {
  LEAD = 'lead',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

export enum InsightType {
  RECOMMENDATION = 'recommendation',
  WARNING = 'warning',
  PREDICTION = 'prediction',
  OPPORTUNITY = 'opportunity',
  RISK = 'risk',
}

export enum InsightStatus {
  NEW = 'new',
  VIEWED = 'viewed',
  ACTIONED = 'actioned',
  DISMISSED = 'dismissed',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IntegrationType {
  HUBSPOT = 'hubspot',
  NOTION = 'notion',
  GMAIL = 'gmail',
  SLACK = 'slack',
  META = 'meta',
  GOOGLE_ADS = 'google_ads',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  SYNCING = 'syncing',
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// Service Layer Types
// ============================================================================

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode?: number;
  };
}

export interface CreateDealData {
  title: string;
  value?: number;
  stage: DealStage;
  probability?: number;
  closeDate?: Date;
  contactName?: string;
  contactEmail?: string;
  company?: string;
  workspaceId: string;
  assignedToId?: string;
}

export interface UpdateDealData {
  title?: string;
  value?: number;
  stage?: DealStage;
  probability?: number;
  closeDate?: Date;
  contactName?: string;
  contactEmail?: string;
  company?: string;
  assignedToId?: string;
}

export interface CreateInsightData {
  type: InsightType;
  title: string;
  description: string;
  priority: Priority;
  confidence: number;
  impactScore?: number;
  data?: any;
  actions?: any;
  workspaceId: string;
}

export interface CreateWorkspaceData {
  name: string;
  slug: string;
  tier: WorkspaceTier;
  ownerId: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface PipelineMetrics {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  averageDealSize: number;
  conversionRate: number;
  averageSalesCycleDays: number;
  stageDistribution: Record<DealStage, number>;
  velocity: number;
}

export interface ConversionMetrics {
  stageConversion: Record<string, number>;
  timeInStage: Record<DealStage, number>;
  dropOffPoints: Array<{
    stage: DealStage;
    dropOffRate: number;
    impact: string;
  }>;
}

export interface RevenueMetrics {
  current: number;
  projected: number;
  growth: number;
  byStage: Record<DealStage, number>;
  trend: Array<{
    date: string;
    value: number;
  }>;
}

// ============================================================================
// Repository Types
// ============================================================================

export interface FindOptions {
  where?: any;
  include?: any;
  orderBy?: any;
  skip?: number;
  take?: number;
}

export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findMany(options?: FindOptions): Promise<T[]>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  delete(id: string): Promise<void>;
  count(where?: any): Promise<number>;
}

// ============================================================================
// Error Types
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404,
      'NOT_FOUND',
      true
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED', true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT', true);
  }
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  del(key: string): Promise<void>;
  flush(namespace?: string): Promise<void>;
}

// ============================================================================
// Logger Types
// ============================================================================

export interface LogContext {
  userId?: string;
  workspaceId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}
