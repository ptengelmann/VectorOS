/**
 * Revenue Forecast Page
 * AI-powered revenue forecasting with 85%+ accuracy
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { apiClient, type RevenueForecast } from '@/lib/api-client';
import DashboardHeader from '../components/dashboard/DashboardHeader';

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
      const response = await apiClient.generateForecast(workspaceId, timeframe, 'likely');

      console.log('[Forecast] Response:', response);

      if (response.success && response.data) {
        setForecast(response.data);
      } else {
        setError(response.error?.message || 'Failed to generate forecast');
      }
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

  if (!isLoaded || !workspaceId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 font-light">Loading...</div>
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

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Revenue Forecast</h1>
          <p className="text-sm font-light text-gray-500">
            AI-powered revenue predictions with 85%+ accuracy
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
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-peach-500"></div>
          </div>
        )}

        {forecast && (
          <div className="space-y-6">
            {/* Big 3 Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Predicted Revenue"
                value={formatCurrency(forecast.predicted_revenue)}
                subtitle={`${formatPercent(forecast.confidence)} confidence`}
                index={0}
              />
              <MetricCard
                title="Pipeline Coverage"
                value={`${forecast.pipeline_coverage.toFixed(1)}x`}
                subtitle={forecast.pipeline_coverage >= 2.5 ? 'Healthy coverage' : 'Below target (2.5x)'}
                index={1}
              />
              <MetricCard
                title="Deals Analyzed"
                value={forecast.deals_analyzed.toString()}
                subtitle={`Closing in next ${timeframe.replace('d', ' days')}`}
                index={2}
              />
            </div>

            {/* Scenario Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <h2 className="text-xs font-light text-gray-500 tracking-wide uppercase mb-4">
                Scenario Analysis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ScenarioCard
                  label="Best Case"
                  value={formatCurrency(forecast.best_case)}
                  description="All deals close"
                  color="green"
                />
                <ScenarioCard
                  label="Likely Case"
                  value={formatCurrency(forecast.likely_case)}
                  description="Weighted forecast"
                  color="peach"
                />
                <ScenarioCard
                  label="Worst Case"
                  value={formatCurrency(forecast.worst_case)}
                  description="High-probability only"
                  color="amber"
                />
              </div>
            </motion.div>

            {/* Breakdown by Stage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <h2 className="text-xs font-light text-gray-500 tracking-wide uppercase mb-4">
                Breakdown by Stage
              </h2>
              <div className="space-y-3">
                {forecast.breakdown_by_stage.map((stage, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <div className="font-light text-gray-900 capitalize">{stage.stage}</div>
                      <div className="text-sm font-light text-gray-500">
                        {stage.deals} deals · Avg probability {formatPercent(stage.avg_probability)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-light text-gray-900">
                        {formatCurrency(stage.weighted_value)}
                      </div>
                      <div className="text-sm font-light text-gray-500">
                        of {formatCurrency(stage.total_value)}
                      </div>
                    </div>
                  </div>
                ))}
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
                <h2 className="text-xs font-light text-gray-500 tracking-wide uppercase mb-4">
                  Top Forecasted Deals
                </h2>
                <div className="space-y-2">
                  {forecast.forecasted_deals.slice(0, 5).map((deal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-peach-200 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="font-light text-gray-900">{deal.title}</div>
                        <div className="text-sm font-light text-gray-500">
                          {deal.company} · {deal.stage}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-light text-gray-900">
                          {formatCurrency(deal.weighted_value)}
                        </div>
                        <div className="text-sm font-light text-gray-500">
                          {formatPercent(deal.adjusted_probability)} probability
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Historical Accuracy */}
            {forecast.historical_accuracy && forecast.historical_accuracy.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="bg-white border border-gray-100 rounded-2xl p-6"
              >
                <h2 className="text-xs font-light text-gray-500 tracking-wide uppercase mb-4">
                  Historical Accuracy (AI Learning Over Time)
                </h2>
                <div className="space-y-2">
                  {forecast.historical_accuracy.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="font-light text-gray-700">{entry.month}</div>
                      <div className="flex items-center gap-6 text-sm font-light">
                        <span className="text-gray-600">
                          Predicted: {formatCurrency(entry.predicted)}
                        </span>
                        <span className="text-gray-600">
                          Actual: {formatCurrency(entry.actual)}
                        </span>
                        <span
                          className={`font-light ${
                            entry.error_percentage < 10 ? 'text-green-600' : 'text-amber-600'
                          }`}
                        >
                          {entry.error_percentage.toFixed(1)}% error
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// MetricCard Component
function MetricCard({ title, value, subtitle, index }: { title: string; value: string; subtitle: string; index: number }) {
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
      className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-peach-200 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="text-xs font-light text-gray-500 tracking-wide uppercase mb-3">{title}</div>
      <motion.div
        className="text-3xl font-light text-gray-900 mb-2"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 + 0.2, type: "spring", stiffness: 200 }}
      >
        {value}
      </motion.div>
      <div className="text-sm font-light text-gray-500">{subtitle}</div>
    </motion.div>
  );
}

// ScenarioCard Component
function ScenarioCard({ label, value, description, color }: { label: string; value: string; description: string; color: 'green' | 'peach' | 'amber' }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-100',
    peach: 'bg-peach-50 border-peach-100',
    amber: 'bg-amber-50 border-amber-100',
  };

  const textColorClasses = {
    green: 'text-green-700',
    peach: 'text-peach-700',
    amber: 'text-amber-700',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className={`text-xs font-light ${textColorClasses[color]} uppercase mb-1`}>
        {label}
      </div>
      <div className="text-2xl font-light text-gray-900 mb-1">{value}</div>
      <div className={`text-xs font-light ${textColorClasses[color]}`}>{description}</div>
    </div>
  );
}
