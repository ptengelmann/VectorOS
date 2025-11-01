/**
 * VectorOS Dashboard
 * Enterprise dashboard with real-time metrics and AI insights
 */

'use client';

import { useEffect, useState } from 'react';
import { apiClient, type PipelineMetrics, type Deal } from '@/lib/api-client';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import MetricCard from '../components/dashboard/MetricCard';
import PipelineStages from '../components/dashboard/PipelineStages';
import DealsList from '../components/dashboard/DealsList';
import AIInsightsCard from '../components/dashboard/AIInsightsCard';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendHealth, setBackendHealth] = useState(false);
  const [aiHealth, setAIHealth] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get workspace ID from localStorage
    const storedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    // For demo/development: Use demo workspace if no workspace is set
    const workspaceToUse = storedWorkspaceId || '4542c01f-fa18-41fc-b232-e6d15a2ef0cd';
    setWorkspaceId(workspaceToUse);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    loadDashboardData();
    checkSystemHealth();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
      checkSystemHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [workspaceId]);

  const loadDashboardData = async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      // Load metrics
      const metricsResponse = await apiClient.getPipelineMetrics(workspaceId);
      console.log('[Dashboard] Metrics response:', metricsResponse);
      if (metricsResponse.success && metricsResponse.data) {
        // Handle nested data structure from API wrapper
        const metricsData = metricsResponse.data.data || metricsResponse.data;
        console.log('[Dashboard] Setting metrics:', metricsData);
        setMetrics(metricsData);
      }

      // Load deals
      const dealsResponse = await apiClient.getDeals(workspaceId, 1, 10);
      if (dealsResponse.success && dealsResponse.data) {
        // Handle nested data structure from API wrapper
        const items = dealsResponse.data.data?.items || dealsResponse.data.items || [];
        setDeals(items);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    const [backend, ai] = await Promise.all([
      apiClient.healthCheck(),
      apiClient.aiHealthCheck(),
    ]);

    setBackendHealth(backend);
    setAIHealth(ai);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader backendHealth={backendHealth} aiHealth={aiHealth} activePage="dashboard" />

      <main className="max-w-7xl mx-auto px-8 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
            <h3 className="text-lg font-normal text-red-900 mb-2">Error</h3>
            <p className="text-sm font-light text-red-700 mb-4">{error}</p>
            <a
              href="/onboarding"
              className="inline-block px-6 py-2.5 bg-red-600 text-white text-sm font-light rounded-lg hover:bg-red-700 transition-colors"
            >
              Go to Onboarding
            </a>
          </div>
        ) : loading && !metrics ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-peach-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm font-light text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Pipeline"
                value={metrics ? formatCurrency(metrics.totalValue) : '$0'}
                subtitle={`${metrics?.totalDeals || 0} deals`}
                trend="+12%"
                trendUp={true}
              />
              <MetricCard
                title="Weighted Value"
                value={metrics ? formatCurrency(metrics.weightedValue) : '$0'}
                subtitle="Probability adjusted"
                trend="+8%"
                trendUp={true}
              />
              <MetricCard
                title="Avg Deal Size"
                value={metrics ? formatCurrency(metrics.averageDealSize) : '$0'}
                subtitle="Per opportunity"
                trend="-3%"
                trendUp={false}
              />
              <MetricCard
                title="Conversion Rate"
                value={metrics ? formatPercent(metrics.conversionRate) : '0%'}
                subtitle="Win rate"
                trend="+5%"
                trendUp={true}
              />
            </div>

            {/* Pipeline Stages */}
            {metrics && metrics.stageDistribution && (
              <PipelineStages
                stageDistribution={metrics.stageDistribution}
                totalDeals={metrics.totalDeals}
              />
            )}

            {/* AI Insights Card */}
            <AIInsightsCard />

            {/* Recent Deals */}
            <DealsList deals={deals} />
          </div>
        )}
      </main>
    </div>
  );
}
