/**
 * Enterprise API Client
 * Type-safe API client for VectorOS Backend
 */

// Log environment for debugging
if (typeof window !== 'undefined') {
  console.log('[API Client] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
}

// Use environment variable or throw error in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('NEXT_PUBLIC_API_URL must be set in production'); })()
    : 'http://localhost:3001');

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
  deal_title: string;
  analyzed_at: string;
  analysis: {
    executive_summary: string;
    win_probability: number;
    win_probability_reasoning: string;
    strengths: string[];
    risks: Array<{
      risk: string;
      severity: 'high' | 'medium' | 'low';
      mitigation: string;
    }>;
    next_best_actions: Array<{
      action: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      expected_impact: string;
      timeline: string;
    }>;
    competitive_insights: string;
    timing_analysis: string;
    recommended_focus_areas: string[];
    confidence_level: number;
    error?: string;
  };
  metadata: {
    model: string;
    context_deals: number;
  };
}

export interface DealScore {
  health_score: number;
  health_status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  components: {
    probability: number;
    velocity: number;
    freshness: number;
    completeness: number;
    urgency: number;
    value_score: number;
  };
  insights: string[];
}

export interface WorkspaceScoreMetrics {
  average_health: number;
  total_deals: number;
  scored_deals: number;
  health_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
}

export interface RevenueForecast {
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
  breakdown_by_stage: Array<{
    stage: string;
    deals: number;
    total_value: number;
    weighted_value: number;
    avg_probability: number;
  }>;
  forecasted_deals: Array<{
    deal_id: string;
    title: string;
    company: string;
    value: number;
    stage: string;
    original_probability: number;
    adjusted_probability: number;
    weighted_value: number;
    similar_deals_analyzed: number;
    confidence: number;
    close_date?: string;
  }>;
  historical_accuracy: Array<{
    month: string;
    predicted: number;
    actual: number;
    error_percentage: number;
  }>;
  generated_at: string;
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

export interface Activity {
  id: string;
  type: string; // email, call, meeting, note
  subject?: string;
  content?: string;
  scheduledAt?: string;
  completedAt?: string;
  dealId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityData {
  type: string; // email, call, meeting, note
  subject?: string;
  content?: string;
  scheduledAt?: Date | string;
  completedAt?: Date | string;
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

      // Handle responses that already include success field
      // If the response has both success and data fields, it's already in the correct format
      if (data.success !== undefined && data.data !== undefined) {
        return data;
      }

      // If the response only has success but no data field, wrap it
      if (data.success !== undefined) {
        return {
          success: data.success,
          data: data,
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

  async createWorkspace(userId: string, data: CreateWorkspaceData, userName?: string, userEmail?: string): Promise<ApiResponse<Workspace>> {
    return this.request<Workspace>(`${API_BASE_URL}/api/v1/workspaces`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        ownerId: userId,
        userName,
        userEmail,
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

  async analyzeDealWithAI(deal: Deal, workspaceDeals?: Deal[]): Promise<ApiResponse<DealAnalysis>> {
    return this.request<DealAnalysis>(`${AI_BASE_URL}/api/v1/deals/analyze`, {
      method: 'POST',
      body: JSON.stringify({
        deal,
        workspace_deals: workspaceDeals || []
      }),
    });
  }

  // Score a single deal
  async scoreDeal(deal: Deal, workspaceDeals?: Deal[]): Promise<ApiResponse<DealScore>> {
    return this.request<DealScore>(`${AI_BASE_URL}/api/v1/deals/score`, {
      method: 'POST',
      body: JSON.stringify({
        deal,
        workspace_deals: workspaceDeals || []
      }),
    });
  }

  // Score all deals in workspace
  async scoreWorkspaceDeals(deals: Deal[]): Promise<ApiResponse<{
    scored_deals: Array<{
      deal_id: string;
      title: string;
      health_score: number;
      health_status: string;
      components: DealScore['components'];
      insights: string[];
    }>;
    workspace_metrics: WorkspaceScoreMetrics;
  }>> {
    return this.request(`${AI_BASE_URL}/api/v1/deals/score-workspace`, {
      method: 'POST',
      body: JSON.stringify({ deals }),
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
  // Activities API
  // ========================================================================

  async getActivities(dealId: string, page = 1, limit = 20): Promise<ApiResponse<{ items: Activity[] }>> {
    return this.request<{ items: Activity[] }>(
      `${API_BASE_URL}/api/v1/deals/${dealId}/activities?page=${page}&limit=${limit}`
    );
  }

  async getActivity(activityId: string): Promise<ApiResponse<Activity>> {
    return this.request<Activity>(`${API_BASE_URL}/api/v1/activities/${activityId}`);
  }

  async createActivity(dealId: string, activity: CreateActivityData): Promise<ApiResponse<Activity>> {
    return this.request<Activity>(`${API_BASE_URL}/api/v1/deals/${dealId}/activities`, {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  }

  async updateActivity(activityId: string, activity: Partial<CreateActivityData>): Promise<ApiResponse<Activity>> {
    return this.request<Activity>(`${API_BASE_URL}/api/v1/activities/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify(activity),
    });
  }

  async deleteActivity(activityId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${API_BASE_URL}/api/v1/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  async markActivityCompleted(activityId: string): Promise<ApiResponse<Activity>> {
    return this.request<Activity>(`${API_BASE_URL}/api/v1/activities/${activityId}/complete`, {
      method: 'PATCH',
    });
  }

  // ========================================================================
  // Revenue Forecasting (THE KILLER FEATURE)
  // ========================================================================

  async generateForecast(
    workspaceId: string,
    timeframe: '30d' | '60d' | '90d' = '30d',
    scenario: 'best' | 'likely' | 'worst' = 'likely'
  ): Promise<ApiResponse<RevenueForecast>> {
    return this.request<RevenueForecast>(`${API_BASE_URL}/api/v1/forecast/generate`, {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        timeframe,
        scenario,
      }),
    });
  }

  async getForecastHistory(
    workspaceId: string,
    limit: number = 10
  ): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/forecasts?limit=${limit}`);
  }

  async getForecastById(forecastId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`${API_BASE_URL}/api/v1/forecasts/${forecastId}`);
  }

  async updateForecastOutcome(
    forecastId: string,
    actualRevenue: number
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`${API_BASE_URL}/api/v1/forecasts/${forecastId}/outcome`, {
      method: 'PATCH',
      body: JSON.stringify({ actualRevenue }),
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
