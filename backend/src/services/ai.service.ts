/**
 * AI Service
 * Integration with VectorOS AI Core microservice
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../utils/config';
import { AppLogger, createLogger } from '../utils/logger';

interface AIAnalysisRequest {
  dealId: string;
  workspaceId: string;
  dealData: any;
}

interface AIInsightRequest {
  workspaceId: string;
  dataType: string;
  data: any;
  timeframe?: string;
}

interface AIChatRequest {
  message: string;
  workspaceId: string;
  userId?: string;
  context?: any;
}

export class AIService {
  private client: AxiosInstance;
  private logger: AppLogger;

  constructor() {
    this.client = axios.create({
      baseURL: config.aiCoreUrl,
      timeout: config.aiTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger = createLogger({ service: 'AIService' });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      config => {
        this.logger.debug('AI Request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      error => {
        this.logger.error('AI Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      response => {
        this.logger.debug('AI Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      error => {
        this.logger.error('AI Response Error', error, {
          status: error.response?.status,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Analyze deal with AI
   */
  async analyzeDeal(request: AIAnalysisRequest): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.info('Analyzing deal with AI', {
        dealId: request.dealId,
        workspaceId: request.workspaceId,
      });

      const response = await this.client.post('/api/v1/deals/analyze', {
        workspace_id: request.workspaceId,
        deal_id: request.dealId,
        deals: [request.dealData],
        analysis_depth: 'standard',
      });

      const duration = Date.now() - startTime;
      this.logger.logAIOperation('deal_intelligence', 'analyze', duration, {
        dealId: request.dealId,
        score: response.data.overall_score,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Deal analysis failed', error as Error, {
        dealId: request.dealId,
      });
      throw new Error(`AI deal analysis failed: ${(error as any).message}`);
    }
  }

  /**
   * Generate strategic insights
   */
  async generateInsights(request: AIInsightRequest): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.info('Generating insights with AI', {
        workspaceId: request.workspaceId,
        dataType: request.dataType,
      });

      const response = await this.client.post('/api/v1/insights/generate', {
        workspace_id: request.workspaceId,
        data_type: request.dataType,
        data: request.data,
        timeframe: request.timeframe || '30d',
        include_recommendations: true,
      });

      const duration = Date.now() - startTime;
      this.logger.logAIOperation('strategic_analyst', 'generate_insights', duration, {
        workspaceId: request.workspaceId,
        insightCount: response.data.insights?.length || 0,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Insight generation failed', error as Error, {
        workspaceId: request.workspaceId,
      });
      throw new Error(`AI insight generation failed: ${(error as any).message}`);
    }
  }

  /**
   * Chat with AI
   */
  async chat(request: AIChatRequest): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.info('AI chat request', {
        workspaceId: request.workspaceId,
        messageLength: request.message.length,
      });

      const response = await this.client.post('/api/v1/chat', {
        message: request.message,
        workspace_id: request.workspaceId,
        user_id: request.userId,
        context: request.context || {},
      });

      const duration = Date.now() - startTime;
      this.logger.logAIOperation('chat', 'message', duration, {
        responseLength: response.data.response?.length || 0,
      });

      return response.data;
    } catch (error) {
      this.logger.error('AI chat failed', error as Error, {
        workspaceId: request.workspaceId,
      });
      throw new Error(`AI chat failed: ${(error as any).message}`);
    }
  }

  /**
   * Execute custom agent task
   */
  async executeAgent(agentType: string, instruction: string, context: any): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.info('Executing agent task', {
        agentType,
        instruction: instruction.substring(0, 100),
      });

      const response = await this.client.post('/api/v1/agents/execute', {
        task_id: this.generateTaskId(),
        agent_type: agentType,
        instruction,
        context,
        max_iterations: 5,
        timeout: 120,
      });

      const duration = Date.now() - startTime;
      this.logger.logAIOperation(agentType, 'execute', duration, {
        success: response.data.success,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Agent execution failed', error as Error, {
        agentType,
      });
      throw new Error(`Agent execution failed: ${(error as any).message}`);
    }
  }

  /**
   * Health check for AI Core
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.warn('AI Core health check failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Generate forecast
   */
  async generateForecast(workspaceId: string, historicalData: any[]): Promise<any> {
    try {
      this.logger.info('Generating forecast', { workspaceId });

      const response = await this.client.post('/api/v1/forecast', {
        workspace_id: workspaceId,
        historical_data: historicalData,
        forecast_period: '90d',
        confidence_level: 0.95,
        include_scenarios: true,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Forecast generation failed', error as Error, {
        workspaceId,
      });
      throw new Error(`Forecast generation failed: ${(error as any).message}`);
    }
  }

  /**
   * Analyze conversion funnel
   */
  async analyzeFunnel(workspaceId: string, funnelData: any): Promise<any> {
    try {
      return await this.executeAgent(
        'strategic_analyst',
        'Analyze conversion funnel and identify optimization opportunities',
        {
          workspace_id: workspaceId,
          funnel_data: funnelData,
        }
      );
    } catch (error) {
      this.logger.error('Funnel analysis failed', error as Error);
      throw error;
    }
  }

  /**
   * Detect churn risks
   */
  async detectChurnRisks(workspaceId: string, deals: any[]): Promise<any> {
    try {
      return await this.executeAgent(
        'strategic_analyst',
        'Identify deals at risk of churning and recommend mitigation actions',
        {
          workspace_id: workspaceId,
          deals,
        }
      );
    } catch (error) {
      this.logger.error('Churn detection failed', error as Error);
      throw error;
    }
  }

  /**
   * Analyze workspace deals and generate insights
   * Calls the autonomous insights generator in AI Core
   */
  async analyzeWorkspace(workspaceId: string, deals: any[]): Promise<any[]> {
    this.logger.info('Generating autonomous insights for workspace', {
      workspaceId,
      dealCount: deals.length
    });

    try {
      const response = await this.client.post(
        '/api/v1/insights/generate',
        {
          workspace_id: workspaceId,
          user_id: null,  // Optional
          deals: deals    // Pass real deals from database
        }
      );

      if (response.data.success) {
        return response.data.insights || [];
      } else {
        throw new Error('AI Core returned unsuccessful response');
      }
    } catch (error) {
      this.logger.error('Autonomous insights generation failed', error as Error);
      throw error;
    }
  }

  // Private helpers
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
