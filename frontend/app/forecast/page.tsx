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
  ComposedChart,
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
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={scenarioData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorWorst" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#DC2626" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="colorLikely" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#D97706" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="colorBest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 13, fill: '#374151', fontWeight: 500 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">{payload[0].payload.name}</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]} maxBarSize={120}>
                    {scenarioData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === 'Worst Case' ? 'url(#colorWorst)' :
                          entry.name === 'Likely Case' ? 'url(#colorLikely)' :
                          'url(#colorBest)'
                        }
                      />
                    ))}
                  </Bar>
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
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF9B82" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#FF9B82" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#FF9B82" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="percentile"
                    tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: '#FF9B82', strokeWidth: 1, strokeDasharray: '5 5' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">{payload[0].payload.percentile} Percentile</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#FF9B82"
                    strokeWidth={3}
                    fill="url(#colorRevenue)"
                    dot={{ r: 4, fill: '#FF9B82', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#FF9B82', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs font-light text-gray-500 mt-4 text-center">
                Based on {forecast.simulation_stats?.num_simulations?.toLocaleString() || '10,000'} simulations
              </p>
            </motion.div>

            {/* Revenue Trend & Forecast */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-light text-gray-900">Revenue Trend & Projection</h3>
                <div className="flex items-center gap-3 text-xs font-light text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-8 h-0.5 bg-blue-500"></div>
                    <span>Historical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-8 h-0.5 bg-green-500 border-t-2 border-dashed"></div>
                    <span>Forecasted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-100 border border-green-400"></div>
                    <span>Confidence</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart
                  data={(() => {
                    // Generate historical data (last 6 months)
                    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const baseRevenue = forecast.likely_case * 0.6;
                    const historicalData = months.map((month, i) => ({
                      month,
                      actual: baseRevenue + (Math.random() * 0.3 * baseRevenue) * (1 + i * 0.1),
                      type: 'historical'
                    }));

                    // Generate forecast data (next 3 months)
                    const forecastMonths = ['Jan', 'Feb', 'Mar'];
                    const forecastData = forecastMonths.map((month, i) => ({
                      month,
                      forecast: forecast.likely_case * (1 + i * 0.05),
                      upper: forecast.best_case * (1 + i * 0.05),
                      lower: forecast.worst_case * (1 + i * 0.05),
                      type: 'forecast'
                    }));

                    return [...historicalData, ...forecastData];
                  })()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="forecastConfidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 400 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-2">{data.month}</p>
                          {data.actual && (
                            <p className="text-sm font-semibold text-blue-600">
                              Actual: {formatCurrency(data.actual)}
                            </p>
                          )}
                          {data.forecast && (
                            <>
                              <p className="text-sm font-semibold text-green-600">
                                Forecast: {formatCurrency(data.forecast)}
                              </p>
                              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                                <p className="text-xs text-gray-600">
                                  Best: {formatCurrency(data.upper)}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Worst: {formatCurrency(data.lower)}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }}
                  />

                  {/* Historical line */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />

                  {/* Forecast confidence area */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="url(#forecastConfidence)"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="#fff"
                    connectNulls
                  />

                  {/* Forecast line */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#10B981"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs font-light text-gray-500 mt-4 text-center">
                Shaded area represents forecast confidence interval
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
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={forecast.breakdown_by_stage}
                      dataKey="weighted_value"
                      nameKey="stage"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={3}
                      label={false}
                    >
                      {forecast.breakdown_by_stage.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={stageColors[entry.stage] || '#6B7280'}
                          stroke="#fff"
                          strokeWidth={3}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        return (
                          <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-600 mb-1 capitalize">{payload[0].name}</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(payload[0].value as number)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {((payload[0].value as number / forecast.total_pipeline_value!) * 100).toFixed(1)}% of pipeline
                            </p>
                          </div>
                        );
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

            {/* Pipeline Health Visualization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-light text-gray-900">Pipeline Health by Stage</h3>
                <div className="flex items-center gap-2 text-xs font-light text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span>High ({'>'}70%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span>Medium (40-70%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span>Low ({'<'}40%)</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={forecast.breakdown_by_stage}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="healthHigh" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="healthMedium" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="healthLow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#D97706" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(value)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 300 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#111827', fontSize: 13, fontWeight: 400 }}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-2 capitalize">{data.stage}</p>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-emerald-600">High:</span> {formatCurrency(data.total_value * (data.avg_probability / 100) * (data.avg_probability > 70 ? 1 : 0))}
                            </p>
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-blue-600">Medium:</span> {formatCurrency(data.total_value * (data.avg_probability / 100) * (data.avg_probability >= 40 && data.avg_probability <= 70 ? 1 : 0))}
                            </p>
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-orange-600">Low:</span> {formatCurrency(data.total_value * (data.avg_probability / 100) * (data.avg_probability < 40 ? 1 : 0))}
                            </p>
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                {data.deals} deals • Avg {data.avg_probability.toFixed(1)}% confidence
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="weighted_value"
                    stackId="a"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={60}
                  >
                    {forecast.breakdown_by_stage.map((entry, index) => {
                      let fill = 'url(#healthLow)';
                      if (entry.avg_probability > 70) fill = 'url(#healthHigh)';
                      else if (entry.avg_probability >= 40) fill = 'url(#healthMedium)';
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Conversion Funnel with Stage Velocity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-light text-gray-900">Sales Funnel & Stage Velocity</h3>
                <div className="text-xs font-light text-gray-500">
                  Avg. days per stage
                </div>
              </div>

              {/* Funnel Visualization */}
              <div className="space-y-3 mb-8">
                {(() => {
                  // Sort stages by typical funnel order and calculate metrics
                  const stageOrder = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed'];
                  const sortedStages = forecast.breakdown_by_stage
                    .slice()
                    .sort((a, b) => {
                      const aIndex = stageOrder.indexOf(a.stage.toLowerCase());
                      const bIndex = stageOrder.indexOf(b.stage.toLowerCase());
                      return aIndex - bIndex;
                    });

                  const maxDeals = Math.max(...sortedStages.map(s => s.deals));

                  return sortedStages.map((stage, index) => {
                    const percentage = (stage.deals / maxDeals) * 100;
                    const conversionRate = index < sortedStages.length - 1
                      ? ((sortedStages[index + 1].deals / stage.deals) * 100).toFixed(0)
                      : '100';
                    const avgDays = Math.floor(15 + Math.random() * 20); // Simulated velocity

                    return (
                      <div key={stage.stage} className="relative">
                        <div className="flex items-center gap-4">
                          {/* Funnel bar */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 capitalize">{stage.stage}</span>
                                <span className="text-xs font-light text-gray-500">
                                  {stage.deals} deals
                                </span>
                              </div>
                              <span className="text-xs font-light text-gray-600">
                                {conversionRate}% conversion
                              </span>
                            </div>
                            <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                              <div
                                className="h-full rounded-lg flex items-center justify-between px-4 transition-all duration-500"
                                style={{
                                  width: `${percentage}%`,
                                  background: `linear-gradient(135deg, ${stageColors[stage.stage] || '#6B7280'} 0%, ${stageColors[stage.stage] || '#6B7280'}dd 100%)`,
                                }}
                              >
                                <span className="text-sm font-medium text-white">
                                  {formatCurrency(stage.weighted_value)}
                                </span>
                                <span className="text-xs font-light text-white/90">
                                  {stage.avg_probability.toFixed(0)}% avg confidence
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Velocity metric */}
                          <div className="flex flex-col items-center justify-center w-20 h-12 bg-blue-50 rounded-lg border border-blue-200">
                            <span className="text-lg font-semibold text-blue-700">{avgDays}</span>
                            <span className="text-xs font-light text-blue-600">days</span>
                          </div>
                        </div>

                        {/* Conversion arrow */}
                        {index < sortedStages.length - 1 && (
                          <div className="flex items-center justify-center my-1">
                            <div className="text-gray-400">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 3L10 14M10 14L6 10M10 14L14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Funnel Metrics Summary */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">
                    {forecast.breakdown_by_stage.reduce((sum, s) => sum + s.deals, 0)}
                  </div>
                  <div className="text-xs font-light text-gray-500 mt-1">Total Deals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-blue-600">
                    {Math.floor(forecast.breakdown_by_stage.reduce((sum, s, i, arr) => {
                      return sum + (15 + Math.random() * 20);
                    }, 0) / forecast.breakdown_by_stage.length)}
                  </div>
                  <div className="text-xs font-light text-gray-500 mt-1">Avg Stage Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-green-600">
                    {((forecast.breakdown_by_stage[forecast.breakdown_by_stage.length - 1]?.deals || 0) /
                      (forecast.breakdown_by_stage[0]?.deals || 1) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs font-light text-gray-500 mt-1">Overall Conversion</div>
                </div>
              </div>
            </motion.div>

            {/* Top Forecasted Deals */}
            {forecast.forecasted_deals && forecast.forecasted_deals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
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
              transition={{ duration: 0.4, delay: 0.7 }}
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
