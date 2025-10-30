/**
 * Enterprise Logging System
 * Winston-based structured logging with rotation and multiple transports
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogContext } from '../types';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: {
    service: 'vectoros-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      ),
    }),

    // Error log file with rotation
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: json(),
    }),

    // Combined log file with rotation
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: json(),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Production: Remove console logging
if (process.env.NODE_ENV === 'production') {
  logger.remove(logger.transports[0]);
}

/**
 * Application Logger with context support
 */
export class AppLogger {
  private context: LogContext = {};

  constructor(context?: LogContext) {
    this.context = context || {};
  }

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  info(message: string, meta?: any): void {
    logger.info(message, { ...this.context, ...meta });
  }

  error(message: string, error?: Error, meta?: any): void {
    logger.error(message, {
      ...this.context,
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    });
  }

  warn(message: string, meta?: any): void {
    logger.warn(message, { ...this.context, ...meta });
  }

  debug(message: string, meta?: any): void {
    logger.debug(message, { ...this.context, ...meta });
  }

  // HTTP request logging
  logRequest(req: any, meta?: any): void {
    this.info('HTTP Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...meta,
    });
  }

  // HTTP response logging
  logResponse(req: any, res: any, duration: number, meta?: any): void {
    this.info('HTTP Response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ...meta,
    });
  }

  // Database operation logging
  logDbOperation(operation: string, table: string, duration?: number, meta?: any): void {
    this.debug('Database Operation', {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      ...meta,
    });
  }

  // Cache operation logging
  logCacheOperation(operation: string, key: string, hit?: boolean, meta?: any): void {
    this.debug('Cache Operation', {
      operation,
      key,
      hit,
      ...meta,
    });
  }

  // AI operation logging
  logAIOperation(agent: string, operation: string, duration?: number, meta?: any): void {
    this.info('AI Operation', {
      agent,
      operation,
      duration: duration ? `${duration}ms` : undefined,
      ...meta,
    });
  }
}

// Default logger instance
export const appLogger = new AppLogger();

// Factory function for creating logger with context
export const createLogger = (context?: LogContext): AppLogger => {
  return new AppLogger(context);
};

export default logger;
