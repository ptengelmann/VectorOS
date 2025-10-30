/**
 * VectorOS Backend - Enterprise Express Application
 *
 * Production-ready API with:
 * - Clean Architecture
 * - Comprehensive error handling
 * - Request validation
 * - Rate limiting
 * - Security middleware
 * - Structured logging
 * - Health checks
 */

import 'express-async-errors';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import { config } from './utils/config';
import { appLogger, createLogger } from './utils/logger';
import { AppError } from './types';

// Repositories
import { DealRepository } from './repositories/deal.repository';

// Services
import { DealService } from './services/deal.service';
import { AIService } from './services/ai.service';
import { InsightService } from './insight.service';

// Initialize Prisma
const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Express
const app: Express = express();

// ============================================================================
// Middleware
// ============================================================================

// Security
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production',
  crossOriginEmbedderPolicy: config.nodeEnv === 'production',
}));

// CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const logger = createLogger({ requestId: req.headers['x-request-id'] as string });

  const startTime = Date.now();

  // Log request
  logger.logRequest(req);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logResponse(req, res, duration);
  });

  next();
});

// Rate limiting
if (config.enableRateLimiting) {
  const limiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: config.rateLimitMax,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', limiter);
}

// ============================================================================
// Dependency Injection Setup
// ============================================================================

// Repositories
const dealRepository = new DealRepository(prisma);

// Services
const aiService = new AIService();
const insightService = new InsightService();
const dealService = new DealService(dealRepository, aiService, insightService);

// Store in app.locals for access in routes
app.locals.services = {
  dealService,
  aiService,
  insightService,
};

app.locals.repositories = {
  dealRepository,
};

// ============================================================================
// Health & Monitoring Routes
// ============================================================================

app.get('/health', async (_req: Request, res: Response) => {
  const dbHealthy = await checkDatabase();
  const aiHealthy = await aiService.healthCheck();

  const status = dbHealthy && aiHealthy ? 'healthy' : 'degraded';

  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    service: 'vectoros-backend',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealthy ? 'up' : 'down',
      aiCore: aiHealthy ? 'up' : 'down',
    },
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const ready = await checkDatabase();

  res.status(ready ? 200 : 503).json({
    ready,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API Routes
// ============================================================================

// API Info
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    name: 'VectorOS API',
    version: '0.1.0',
    description: 'Enterprise Business Operating System API',
    endpoints: {
      deals: '/api/v1/deals',
      insights: '/api/v1/insights',
      workspaces: '/api/v1/workspaces',
      ai: '/api/v1/ai',
    },
  });
});

// Deals Routes
app.get('/api/v1/workspaces/:workspaceId/deals', async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { page = '1', limit = '20', sortBy, sortOrder } = req.query;

  const result = await dealService.getByWorkspace(workspaceId, {
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
  });

  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }

  res.json({
    success: true,
    data: result.data,
  });
});

app.get('/api/v1/deals/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await dealService.getById(id);

  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }

  res.json({
    success: true,
    data: result.data,
  });
});

app.post('/api/v1/workspaces/:workspaceId/deals', async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const dealData = { ...req.body, workspaceId };

  const result = await dealService.create(dealData);

  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }

  res.status(201).json({
    success: true,
    data: result.data,
  });
});

app.patch('/api/v1/deals/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await dealService.update(id, req.body);

  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }

  res.json({
    success: true,
    data: result.data,
  });
});

app.delete('/api/v1/deals/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await dealService.delete(id);

  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }

  res.status(204).send();
});

// Deal Analysis
app.post('/api/v1/deals/:id/analyze', async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await dealService.analyzeDeal(id);

  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }

  res.json({
    success: true,
    data: result.data,
  });
});

// Pipeline Metrics
app.get('/api/v1/workspaces/:workspaceId/metrics/pipeline', async (req: Request, res: Response) => {
  const { workspaceId } = req.params;

  const result = await dealService.getPipelineMetrics(workspaceId);

  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }

  res.json({
    success: true,
    data: result.data,
  });
});

// AI Chat
app.post('/api/v1/ai/chat', async (req: Request, res: Response) => {
  const { message, workspaceId, userId, context } = req.body;

  const result = await aiService.chat({
    message,
    workspaceId,
    userId,
    context,
  });

  res.json({
    success: true,
    data: result,
  });
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  appLogger.error('Unhandled error', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Unknown error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = config.port;

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    appLogger.info('Database connected');

    // Check AI Core
    const aiHealthy = await aiService.healthCheck();
    if (aiHealthy) {
      appLogger.info('AI Core is healthy');
    } else {
      appLogger.warn('AI Core is not available');
    }

    // Start server
    app.listen(PORT, () => {
      appLogger.info('VectorOS Backend started', {
        port: PORT,
        environment: config.nodeEnv,
        nodeVersion: process.version,
      });

      if (config.nodeEnv === 'development') {
        console.log(`\n🚀 VectorOS Backend running at http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`📖 API docs: http://localhost:${PORT}/api/v1\n`);
      }
    });
  } catch (error) {
    appLogger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  appLogger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  appLogger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();

// ============================================================================
// Helper Functions
// ============================================================================

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    appLogger.error('Database health check failed', error as Error);
    return false;
  }
}

export default app;
