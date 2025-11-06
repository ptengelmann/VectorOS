/**
 * VectorOS Revenue Forecasting Dashboard
 * Enterprise-grade Monte Carlo simulation with interactive visualizations
 */

'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { apiClient, type RevenueForecast } from '@/lib/api-client';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  DollarSign,
  Activity,
  Award,
  ArrowRight,
} from 'lucide-react';

export default function ForecastPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState(false);
  const [aiHealth, setAIHealth] = useState(false);

  // Forecast parameters
  const [timeframe, setTimeframe] = useState<'30d' | '60d' | '90d'>('30d');

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
      return;
    }

    const storedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    if (!storedWorkspaceId && isLoaded) {
      router.push('/onboarding');
      return;
    }

    setWorkspaceId(storedWorkspaceId);
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (workspaceId) {
      generateForecast();
      checkSystemHealth();
    }
  }, [workspaceId, timeframe]);

  const checkSystemHealth = async () => {
    const [backend, ai] = await Promise.all([
      apiClient.healthCheck(),
      apiClient.aiHealthCheck(),
    ]);
    setBackendHealth(backend);
    setAIHealth(ai);
  };

  const generateForecast = async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('[Forecast] Generating forecast:', { workspaceId, timeframe });

      // Call AI Core directly for Monte Carlo forecast
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AI_URL}/api/v1/forecast?workspace_id=${workspaceId}&timeframe=${timeframe}&scenario=likely`
      );

      if (!response.ok) {
        throw new Error('Failed to generate forecast');
      }

      const data = await response.json();
      console.log('[Forecast] Monte Carlo data:', data);
      setForecast(data);
    } catch (err: any) {
      console.error('[Forecast] Error:', err);
      setError(err.message || 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Prepare chart data for Monte Carlo visualization
  const scenarioData = forecast
    ? [
        { name: 'Worst Case', value: forecast.worst_case, fill: '#EF4444' },
        { name: 'Likely Case', value: forecast.likely_case, fill: '#F59E0B' },
        { name: 'Best Case', value: forecast.best_case, fill: '#10B981' },
      ]
    : [];

  const distributionData = forecast?.simulation_stats
    ? [
        { percentile: 'P5', value: forecast.worst_case },
        { percentile: 'P10', value: forecast.simulation_stats.p10 },
        { percentile: 'P25', value: forecast.simulation_stats.p25 },
        { percentile: 'P50', value: forecast.likely_case },
        { percentile: 'P75', value: forecast.simulation_stats.p75 },
        { percentile: 'P90', value: forecast.simulation_stats.p90 },
        { percentile: 'P95', value: forecast.best_case },
      ]
    : [];

  const stageColors: Record<string, string> = {
    lead: '#6366F1',
    qualified: '#8B5CF6',
    proposal: '#EC4899',
    negotiation: '#F59E0B',
    closed_won: '#10B981',
    closed_lost: '#EF4444',
  };

  if (!isLoaded || !workspaceId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-peach-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-light">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        backendHealth={backendHealth}
        aiHealth={aiHealth}
        activePage="forecast"
      />

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Revenue Forecasting</h1>
          <p className="text-sm font-light text-gray-600">
            Monte Carlo simulation with 10,000 iterations for statistical accuracy
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-3 mb-8">
          {(['30d', '60d', '90d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              disabled={loading}
              className={`px-6 py-2 rounded-xl text-sm font-light transition-all ${
                timeframe === tf
                  ? 'bg-peach-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-100 hover:border-peach-200'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tf === '30d' ? '30 Days' : tf === '60d' ? '60 Days' : '90 Days'}
            </button>
          ))}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4"
          >
            <p className="text-red-800 text-sm font-light">{error}</p>
          </motion.div>
        )}

        {loading && !forecast && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-peach-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm font-light text-gray-600">
                Running Monte Carlo simulation...
              </p>
            </div>
          </div>
        )}

        {forecast && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard
                title="Predicted Revenue"
                value={formatCurrency(forecast.predicted_revenue)}
                subtitle={`${formatPercent(forecast.confidence)} confidence`}
                icon={<DollarSign className="w-5 h-5 text-peach-500" />}
                index={0}
              />
              <MetricCard
                title="Best Case"
                value={formatCurrency(forecast.best_case)}
                subtitle="95th percentile"
                icon={<TrendingUp className="w-5 h-5 text-green-500" />}
                index={1}
              />
              <MetricCard
                title="Worst Case"
                value={formatCurrency(forecast.worst_case)}
                subtitle="5th percentile"
                icon={<TrendingDown className="w-5 h-5 text-red-500" />}
                index={2}
              />
              <MetricCard
                title="Pipeline Coverage"
                value={formatPercent(forecast.pipeline_coverage)}
                subtitle={`${forecast.deals_analyzed} deals analyzed`}
                icon={<Target className="w-5 h-5 text-blue-500" />}
                index={3}
              />
            </div>

            {/* Scenario Comparison Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <h3 className="text-lg font-light text-gray-900 mb-6">Scenario Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scenarioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Distribution Curve */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <h3 className="text-lg font-light text-gray-900 mb-6">
                Monte Carlo Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={distributionData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9B82" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#FF9B82" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="percentile" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#FF9B82"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs font-light text-gray-500 mt-4 text-center">
                Based on {forecast.simulation_stats?.num_simulations?.toLocaleString() || '10,000'} simulations
              </p>
            </motion.div>

            {/* Pipeline Breakdown by Stage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <h3 className="text-lg font-light text-gray-900 mb-6">Pipeline by Stage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={forecast.breakdown_by_stage}
                      dataKey="weighted_value"
                      nameKey="stage"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {forecast.breakdown_by_stage.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={stageColors[entry.stage] || '#6B7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {forecast.breakdown_by_stage.map((stage, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{
                            backgroundColor: stageColors[stage.stage] || '#6B7280',
                          }}
                        ></div>
                        <span className="text-sm font-light text-gray-700 capitalize">
                          {stage.stage}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-light text-gray-900">
                          {formatCurrency(stage.weighted_value)}
                        </div>
                        <div className="text-xs font-light text-gray-500">
                          {stage.deals} deals · {formatPercent(stage.avg_probability)} avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Top Forecasted Deals */}
            {forecast.forecasted_deals && forecast.forecasted_deals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="bg-white border border-gray-100 rounded-2xl p-6"
              >
                <h3 className="text-lg font-light text-gray-900 mb-6">
                  Top Opportunities by Weighted Value
                </h3>
                <div className="space-y-4">
                  {forecast.forecasted_deals.slice(0, 10).map((deal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-normal text-gray-900">{deal.title}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-light rounded-full capitalize">
                            {deal.stage}
                          </span>
                        </div>
                        <div className="text-xs font-light text-gray-500">{deal.company}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-light text-gray-900 mb-1">
                          {formatCurrency(deal.weighted_value)}
                        </div>
                        <div className="text-xs font-light text-gray-500">
                          {formatPercent(deal.adjusted_probability)} confidence
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Statistics Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="bg-gradient-to-br from-peach-50 to-blue-50 rounded-2xl border border-gray-200 p-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-peach-500" />
                    <span className="text-sm font-light text-gray-600">Simulation Stats</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-light text-gray-700">
                      Mean: {formatCurrency(forecast.mean_forecast || forecast.likely_case)}
                    </div>
                    <div className="text-xs font-light text-gray-700">
                      Std Dev: {formatCurrency(forecast.standard_deviation || 0)}
                    </div>
                    <div className="text-xs font-light text-gray-700">
                      Range: {formatCurrency(forecast.simulation_stats?.min || 0)} -{' '}
                      {formatCurrency(forecast.simulation_stats?.max || 0)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-light text-gray-600">Pipeline Health</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-light text-gray-700">
                      Total Pipeline: {formatCurrency(forecast.total_pipeline_value || 0)}
                    </div>
                    <div className="text-xs font-light text-gray-700">
                      Revenue Goal: {formatCurrency(forecast.revenue_goal || 0)}
                    </div>
                    <div className="text-xs font-light text-gray-700">
                      Required Pipeline: {formatCurrency(forecast.required_pipeline || 0)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-light text-gray-600">Forecast Quality</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-light text-gray-700">
                      Confidence: {formatPercent(forecast.confidence)}
                    </div>
                    <div className="text-xs font-light text-gray-700">
                      Deals Analyzed: {forecast.deals_analyzed}
                    </div>
                    <div className="text-xs font-light text-gray-700">
                      Generated: {new Date(forecast.generated_at || Date.now()).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        )}
      </main>
    </div>
  );
}

// MetricCard Component
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  index,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-peach-200 hover:shadow-lg transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-light text-gray-600">{title}</span>
        {icon}
      </div>
      <motion.div
        className="text-2xl font-light text-gray-900 mb-1"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 + 0.2, type: 'spring', stiffness: 200 }}
      >
        {value}
      </motion.div>
      <div className="text-xs font-light text-gray-500">{subtitle}</div>
    </motion.div>
  );
}
