/**
 * Enterprise Configuration Management
 * Centralized, type-safe configuration with validation
 */

import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Configuration schema with validation
const configSchema = z.object({
  // Application
  nodeEnv: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.coerce.number().default(3001),
  apiVersion: z.string().default('v1'),

  // Database
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  redisUrl: z.string().optional(),
  redisTtl: z.coerce.number().default(3600),

  // JWT
  jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  jwtExpiresIn: z.string().default('7d'),

  // AI Core
  aiCoreUrl: z.string().url().default('http://localhost:8000'),
  aiTimeout: z.coerce.number().default(120000),

  // Rate Limiting
  rateLimitWindow: z.coerce.number().default(900000), // 15 minutes
  rateLimitMax: z.coerce.number().default(100),

  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // CORS
  corsOrigins: z.string().transform(str => str.split(',')).default('http://localhost:3000'),

  // Features
  enableMetrics: z.coerce.boolean().default(true),
  enableCaching: z.coerce.boolean().default(true),
  enableRateLimiting: z.coerce.boolean().default(true),

  // External Services
  hubspotApiKey: z.string().optional(),
  notionApiKey: z.string().optional(),
  slackBotToken: z.string().optional(),
});

// Parse and validate configuration
const parseConfig = () => {
  try {
    return configSchema.parse({
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT || process.env.BACKEND_URL?.split(':').pop(),
      apiVersion: process.env.API_VERSION,
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      redisTtl: process.env.CACHE_TTL,
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN,
      aiCoreUrl: process.env.AI_CORE_URL,
      aiTimeout: process.env.AI_TIMEOUT,
      rateLimitWindow: process.env.RATE_LIMIT_WINDOW,
      rateLimitMax: process.env.RATE_LIMIT_MAX,
      logLevel: process.env.LOG_LEVEL,
      corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
      enableMetrics: process.env.ENABLE_METRICS,
      enableCaching: process.env.ENABLE_CACHING,
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING,
      hubspotApiKey: process.env.HUBSPOT_API_KEY,
      notionApiKey: process.env.NOTION_API_KEY,
      slackBotToken: process.env.SLACK_BOT_TOKEN,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const config = parseConfig();

// Type-safe config object
export type Config = z.infer<typeof configSchema>;

// Utility functions
export const isDevelopment = () => config.nodeEnv === 'development';
export const isProduction = () => config.nodeEnv === 'production';
export const isStaging = () => config.nodeEnv === 'staging';

// Feature flags
export const features = {
  metrics: config.enableMetrics,
  caching: config.enableCaching,
  rateLimiting: config.enableRateLimiting,
} as const;

// Export for testing
export { configSchema };
