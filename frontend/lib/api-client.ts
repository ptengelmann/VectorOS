/**
 * Enterprise API Client
 * Type-safe API client for VectorOS Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability?: number;
  closeDate?: string;
  contactName?: string;
  contactEmail?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineMetrics {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  averageDealSize: number;
  conversionRate: number;
  stageDistribution: Record<string, number>;
}

export interface DealAnalysis {
  deal_id: string;
  overall_score: number;
  win_probability: number;
  health_status: string;
  strengths: string[];
  risks: string[];
  recommended_actions: string[];
  next_best_action?: string;
}

class APIClient {
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'UNKNOWN_ERROR',
            message: 'An error occurred',
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: (error as Error).message,
        },
      };
    }
  }

  // ========================================================================
  // Deals API
  // ========================================================================

  async getDeals(workspaceId: string, page = 1, limit = 20): Promise<ApiResponse<{ items: Deal[] }>> {
    return this.request<{ items: Deal[] }>(
      `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/deals?page=${page}&limit=${limit}`
    );
  }

  async getDeal(dealId: string): Promise<ApiResponse<Deal>> {
    return this.request<Deal>(`${API_BASE_URL}/api/v1/deals/${dealId}`);
  }

  async createDeal(workspaceId: string, deal: Partial<Deal>): Promise<ApiResponse<Deal>> {
    return this.request<Deal>(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/deals`, {
      method: 'POST',
      body: JSON.stringify(deal),
    });
  }

  async updateDeal(dealId: string, deal: Partial<Deal>): Promise<ApiResponse<Deal>> {
    return this.request<Deal>(`${API_BASE_URL}/api/v1/deals/${dealId}`, {
      method: 'PATCH',
      body: JSON.stringify(deal),
    });
  }

  async deleteDeal(dealId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${API_BASE_URL}/api/v1/deals/${dealId}`, {
      method: 'DELETE',
    });
  }

  async analyzeDeal(dealId: string): Promise<ApiResponse<DealAnalysis>> {
    return this.request<DealAnalysis>(`${API_BASE_URL}/api/v1/deals/${dealId}/analyze`, {
      method: 'POST',
    });
  }

  // ========================================================================
  // Metrics API
  // ========================================================================

  async getPipelineMetrics(workspaceId: string): Promise<ApiResponse<PipelineMetrics>> {
    return this.request<PipelineMetrics>(
      `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/metrics/pipeline`
    );
  }

  // ========================================================================
  // AI API
  // ========================================================================

  async chat(message: string, workspaceId: string, context?: any): Promise<ApiResponse<{ response: string; confidence: number }>> {
    return this.request<{ response: string; confidence: number }>(`${API_BASE_URL}/api/v1/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        workspaceId,
        context,
      }),
    });
  }

  // ========================================================================
  // Health Checks
  // ========================================================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }

  async aiHealthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${AI_BASE_URL}/health`);
      const data = await response.json();
      return data.status === 'healthy' || data.status === 'ok';
    } catch {
      return false;
    }
  }
}

export const apiClient = new APIClient();
