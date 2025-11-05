/**
 * Forecast Service
 * Revenue forecasting service - THE killer feature for Revenue Intelligence
 *
 * Integrates with AI Core forecast endpoint to provide:
 * - 30/60/90 day revenue predictions
 * - Best/likely/worst case scenarios
 * - Pipeline coverage analysis
 * - Historical accuracy tracking
 */

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import { config } from '../utils/config';
import { AppLogger, createLogger } from '../utils/logger';

interface ForecastRequest {
  workspaceId: string;
  timeframe?: '30d' | '60d' | '90d';
  scenario?: 'best' | 'likely' | 'worst';
}

interface ForecastResult {
  workspace_id: string;
  timeframe: string;
  scenario: string;
  predicted_revenue: number;
  confidence: number;
  best_case: number;
  likely_case: number;
  worst_case: number;
  pipeline_coverage: number;
  revenue_goal?: number;
  required_pipeline?: number;
  deals_analyzed: number;
  breakdown_by_stage: any[];
  forecasted_deals: any[];
  historical_accuracy: any[];
  generated_at: string;
}

interface SaveForecastRequest {
  workspaceId: string;
  timeframe: string;
  scenario: string;
  forecastData: ForecastResult;
}

export class ForecastService {
  private aiClient: AxiosInstance;
  private logger: AppLogger;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    this.aiClient = axios.create({
      baseURL: config.aiCoreUrl,
      timeout: 120000, // 2 minutes for complex forecasts
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger = createLogger({ service: 'ForecastService' });

    // Request interceptor
    this.aiClient.interceptors.request.use(
      config => {
        this.logger.debug('Forecast Request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      error => {
        this.logger.error('Forecast Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.aiClient.interceptors.response.use(
      response => {
        this.logger.debug('Forecast Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      error => {
        this.logger.error('Forecast Response Error', error, {
          status: error.response?.status,
          url: error.config?.url,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate revenue forecast
   */
  async generateForecast(request: ForecastRequest): Promise<{ success: boolean; data?: ForecastResult; error?: any }> {
    try {
      this.logger.info('Generating forecast', {
        workspaceId: request.workspaceId,
        timeframe: request.timeframe,
        scenario: request.scenario,
      });

      // Call AI Core forecast endpoint
      const response = await this.aiClient.post('/api/v1/forecast/generate', {
        workspace_id: request.workspaceId,
        timeframe: request.timeframe || '30d',
        scenario: request.scenario || 'likely',
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Forecast generation failed');
      }

      const forecast: ForecastResult = response.data.forecast;

      this.logger.info('Forecast generated successfully', {
        workspaceId: request.workspaceId,
        predictedRevenue: forecast.predicted_revenue,
        confidence: forecast.confidence,
        dealsAnalyzed: forecast.deals_analyzed,
      });

      // Save forecast to database for tracking
      await this.saveForecast({
        workspaceId: request.workspaceId,
        timeframe: forecast.timeframe,
        scenario: forecast.scenario,
        forecastData: forecast,
      });

      return {
        success: true,
        data: forecast,
      };

    } catch (error: any) {
      this.logger.error('Forecast generation error', error, {
        workspaceId: request.workspaceId,
      });

      return {
        success: false,
        error: {
          message: error.message || 'Failed to generate forecast',
          statusCode: error.response?.status || 500,
        },
      };
    }
  }

  /**
   * Get forecast history for workspace
   */
  async getForecastHistory(workspaceId: string, limit: number = 10): Promise<{ success: boolean; data?: any[]; error?: any }> {
    try {
      this.logger.info('Fetching forecast history', { workspaceId, limit });

      const forecasts = await this.prisma.revenueForecast.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return {
        success: true,
        data: forecasts,
      };

    } catch (error: any) {
      this.logger.error('Error fetching forecast history', error);

      return {
        success: false,
        error: {
          message: error.message || 'Failed to fetch forecast history',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get single forecast by ID
   */
  async getForecastById(forecastId: string): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const forecast = await this.prisma.revenueForecast.findUnique({
        where: { id: forecastId },
      });

      if (!forecast) {
        return {
          success: false,
          error: {
            message: 'Forecast not found',
            statusCode: 404,
          },
        };
      }

      return {
        success: true,
        data: forecast,
      };

    } catch (error: any) {
      this.logger.error('Error fetching forecast', error);

      return {
        success: false,
        error: {
          message: error.message || 'Failed to fetch forecast',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Save forecast to database for tracking
   */
  private async saveForecast(request: SaveForecastRequest): Promise<void> {
    try {
      const { workspaceId, timeframe, scenario, forecastData } = request;

      await this.prisma.revenueForecast.create({
        data: {
          workspaceId,
          timeframe,
          scenario,
          predictedRevenue: forecastData.predicted_revenue,
          confidence: forecastData.confidence,
          bestCase: forecastData.best_case,
          likelyCase: forecastData.likely_case,
          worstCase: forecastData.worst_case,
          pipelineCoverage: forecastData.pipeline_coverage,
          revenueGoal: forecastData.revenue_goal,
          requiredPipeline: forecastData.required_pipeline,
          dealsAnalyzed: forecastData.deals_analyzed,
          breakdown: forecastData.breakdown_by_stage,
          factors: {
            historical_accuracy: forecastData.historical_accuracy,
            forecasted_deals: forecastData.forecasted_deals,
          },
        },
      });

      this.logger.info('Forecast saved to database', { workspaceId, timeframe, scenario });

    } catch (error) {
      this.logger.error('Error saving forecast to database', error);
      // Don't throw - saving is optional, main forecast should succeed
    }
  }

  /**
   * Update forecast with actual outcome (for learning)
   */
  async updateForecastOutcome(
    forecastId: string,
    actualRevenue: number
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      this.logger.info('Updating forecast outcome', { forecastId, actualRevenue });

      const forecast = await this.prisma.revenueForecast.findUnique({
        where: { id: forecastId },
      });

      if (!forecast) {
        return {
          success: false,
          error: {
            message: 'Forecast not found',
            statusCode: 404,
          },
        };
      }

      // Calculate accuracy
      const predicted = forecast.predictedRevenue;
      const error = Math.abs(predicted - actualRevenue);
      const errorPercentage = actualRevenue > 0 ? (error / actualRevenue) * 100 : 0;
      const accuracyScore = Math.max(0, 100 - errorPercentage);

      // Update forecast
      const updated = await this.prisma.revenueForecast.update({
        where: { id: forecastId },
        data: {
          resolvedAt: new Date(),
          actualRevenue,
          accuracyScore,
        },
      });

      this.logger.info('Forecast outcome updated', {
        forecastId,
        predicted,
        actual: actualRevenue,
        accuracyScore,
      });

      return {
        success: true,
        data: updated,
      };

    } catch (error: any) {
      this.logger.error('Error updating forecast outcome', error);

      return {
        success: false,
        error: {
          message: error.message || 'Failed to update forecast outcome',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.aiClient.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      this.logger.warn('AI Core health check failed', error);
      return false;
    }
  }
}
