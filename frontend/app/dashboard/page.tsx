/**
 * VectorOS Dashboard
 * Enterprise dashboard with real-time metrics and AI insights
 */

'use client';

import { useEffect, useState } from 'react';
import { apiClient, type PipelineMetrics, type Deal } from '@/lib/api-client';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendHealth, setBackendHealth] = useState(false);
  const [aiHealth, setAIHealth] = useState(false);

  const WORKSPACE_ID = 'demo-workspace'; // In production, get from auth context

  useEffect(() => {
    loadDashboardData();
    checkSystemHealth();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
      checkSystemHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Load metrics
      const metricsResponse = await apiClient.getPipelineMetrics(WORKSPACE_ID);
      if (metricsResponse.success && metricsResponse.data) {
        setMetrics(metricsResponse.data);
      }

      // Load deals
      const dealsResponse = await apiClient.getDeals(WORKSPACE_ID, 1, 10);
      if (dealsResponse.success && dealsResponse.data) {
        setDeals(dealsResponse.data.items || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                VectorOS Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI-Powered Business Operating System
              </p>
            </div>

            {/* System Status */}
            <div className="flex items-center space-x-4">
              <StatusIndicator label="Backend" healthy={backendHealth} />
              <StatusIndicator label="AI Core" healthy={aiHealth} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && !metrics ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Pipeline by Stage
                </h2>
                <div className="space-y-3">
                  {Object.entries(metrics.stageDistribution).map(([stage, count]) => (
                    <StageBar key={stage} stage={stage} count={count as number} total={metrics.totalDeals} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Deals */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Deals
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {deals.length > 0 ? (
                  deals.map((deal) => (
                    <DealRow key={deal.id} deal={deal} />
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No deals found. Create your first deal to get started.
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights Placeholder */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">AI Insights Ready</h3>
                  <p className="text-blue-100">
                    Claude AI has analyzed your pipeline and identified 3 high-priority recommendations
                  </p>
                </div>
                <button className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition">
                  View Insights
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function StatusIndicator({ label, healthy }: { label: string; healthy: boolean }) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`h-2 w-2 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  subtitle: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</div>
      <div className="mt-2 flex items-baseline space-x-2">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
        <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      </div>
      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>
    </div>
  );
}

function StageBar({ stage, count, total }: { stage: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  const stageColors: Record<string, string> = {
    lead: 'bg-gray-400',
    qualified: 'bg-blue-500',
    proposal: 'bg-yellow-500',
    negotiation: 'bg-orange-500',
    won: 'bg-green-500',
    lost: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
          {stage}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {count} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${stageColors[stage] || 'bg-gray-400'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DealRow({ deal }: { deal: Deal }) {
  const stageColors: Record<string, string> = {
    lead: 'bg-gray-100 text-gray-800',
    qualified: 'bg-blue-100 text-blue-800',
    proposal: 'bg-yellow-100 text-yellow-800',
    negotiation: 'bg-orange-100 text-orange-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {deal.title}
          </h3>
          <div className="mt-1 flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
            {deal.company && <span>{deal.company}</span>}
            {deal.contactName && <span>· {deal.contactName}</span>}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              ${deal.value?.toLocaleString() || '0'}
            </div>
            {deal.probability && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {deal.probability}% prob
              </div>
            )}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
              stageColors[deal.stage] || stageColors.lead
            }`}
          >
            {deal.stage}
          </span>
        </div>
      </div>
    </div>
  );
}
