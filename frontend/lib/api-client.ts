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

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceData {
  name: string;
  slug?: string;
}

export interface Insight {
  id: string;
  workspaceId: string;
  type: string; // recommendation, warning, prediction, opportunity, risk
  title: string;
  description: string;
  priority: string; // low, medium, high, critical
  confidence: number; // 0.0-1.0
  data: any;
  actions: any;
  status: string; // new, viewed, actioned, dismissed
  createdAt: string;
  updatedAt: string;
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
  // Workspaces API
  // ========================================================================

  async getUserWorkspaces(userId: string): Promise<ApiResponse<Workspace[]>> {
    return this.request<Workspace[]>(`${API_BASE_URL}/api/v1/users/${userId}/workspaces`);
  }

  async getWorkspace(workspaceId: string): Promise<ApiResponse<Workspace>> {
    return this.request<Workspace>(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`);
  }

  async createWorkspace(userId: string, data: CreateWorkspaceData, userName?: string): Promise<ApiResponse<Workspace>> {
    return this.request<Workspace>(`${API_BASE_URL}/api/v1/workspaces`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        ownerId: userId,
        userName,
      }),
    });
  }

  async updateWorkspace(workspaceId: string, userId: string, data: Partial<CreateWorkspaceData>): Promise<ApiResponse<Workspace>> {
    return this.request<Workspace>(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...data,
        userId,
      }),
    });
  }

  async deleteWorkspace(workspaceId: string, userId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
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
  // Insights API
  // ========================================================================

  async generateInsights(workspaceId: string): Promise<ApiResponse<Insight[]>> {
    return this.request<Insight[]>(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/insights/generate`, {
      method: 'POST',
    });
  }

  async getInsights(workspaceId: string): Promise<ApiResponse<Insight[]>> {
    return this.request<Insight[]>(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/insights`);
  }

  async markInsightViewed(insightId: string): Promise<ApiResponse<Insight>> {
    return this.request<Insight>(`${API_BASE_URL}/api/v1/insights/${insightId}/viewed`, {
      method: 'PATCH',
    });
  }

  async markInsightActioned(insightId: string): Promise<ApiResponse<Insight>> {
    return this.request<Insight>(`${API_BASE_URL}/api/v1/insights/${insightId}/actioned`, {
      method: 'PATCH',
    });
  }

  async dismissInsight(insightId: string): Promise<ApiResponse<Insight>> {
    return this.request<Insight>(`${API_BASE_URL}/api/v1/insights/${insightId}/dismiss`, {
      method: 'PATCH',
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
