/**
 * VectorOS AI Insights Dashboard
 * AI-powered business intelligence and recommendations
 */

'use client';

import { useEffect, useState } from 'react';
import { apiClient, type Insight } from '@/lib/api-client';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import InsightCard from '../components/insights/InsightCard';

type ViewMode = 'grid' | 'table';
type FilterPriority = 'all' | 'critical' | 'high' | 'medium' | 'low';
type FilterType = 'all' | 'priority' | 'risk' | 'opportunity' | 'prediction' | 'recommendation';

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState(false);
  const [aiHealth, setAIHealth] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    // For demo/development: Use demo workspace if no workspace is set
    const workspaceToUse = storedWorkspaceId || '4542c01f-fa18-41fc-b232-e6d15a2ef0cd';
    setWorkspaceId(workspaceToUse);
    checkSystemHealth();
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    loadInsights();
  }, [workspaceId]);

  const checkSystemHealth = async () => {
    const [backend, ai] = await Promise.all([
      apiClient.healthCheck(),
      apiClient.aiHealthCheck(),
    ]);
    setBackendHealth(backend);
    setAIHealth(ai);
  };

  const loadInsights = async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getInsights(workspaceId);
      if (response.success && response.data) {
        // Ensure data is an array
        const insightsData = Array.isArray(response.data) ? response.data : [];
        setInsights(insightsData);
      } else {
        setError(response.error?.message || 'Failed to load insights');
        setInsights([]); // Ensure insights is always an array
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
      setError('Failed to load insights');
      setInsights([]); // Ensure insights is always an array
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    if (!workspaceId) return;

    setGenerating(true);
    setError(null);

    try {
      const response = await apiClient.generateInsights(workspaceId);
      if (response.success && response.data) {
        setInsights(response.data);
      } else {
        setError(response.error?.message || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setError('Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const handleInsightAction = async (insightId: string, action: 'viewed' | 'actioned' | 'dismissed') => {
    try {
      let response;
      if (action === 'viewed') {
        response = await apiClient.markInsightViewed(insightId);
      } else if (action === 'actioned') {
        response = await apiClient.markInsightActioned(insightId);
      } else {
        response = await apiClient.dismissInsight(insightId);
      }

      if (response.success) {
        setInsights(insights.map(i => (i.id === insightId ? { ...i, status: action } : i)));
      }
    } catch (error) {
      console.error('Failed to update insight:', error);
    }
  };

  const toggleExpand = (insightId: string) => {
    if (expandedInsight === insightId) {
      setExpandedInsight(null);
    } else {
      setExpandedInsight(insightId);
      const insight = insights.find(i => i.id === insightId);
      if (insight?.status === 'new') {
        handleInsightAction(insightId, 'viewed');
      }
    }
  };

  const getFilteredInsights = () => {
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    return insights
      .filter(i => i.status !== 'dismissed')
      .filter(i => filterPriority === 'all' || i.priority === filterPriority)
      .filter(i => filterType === 'all' || i.type === filterType)
      .filter(i => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          i.title.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aPriority = priorityOrder.indexOf(a.priority);
        const bPriority = priorityOrder.indexOf(b.priority);
        return aPriority - bPriority;
      });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader backendHealth={backendHealth} aiHealth={aiHealth} activePage="insights" />

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-light text-gray-900 mb-2">AI Insights</h1>
              <p className="text-sm font-light text-gray-600">
                AI-powered business intelligence and recommendations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadInsights}
                disabled={loading}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 text-sm font-light rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={generateInsights}
                disabled={generating}
                className="px-5 py-2.5 bg-peach-500 text-white text-sm font-light rounded-lg hover:bg-peach-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Generate New Insights</span>
                )}
              </button>
            </div>
          </div>

          {/* Filters & View Controls */}
          {insights.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search insights..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-light focus:outline-none focus:ring-2 focus:ring-peach-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 text-xs font-light rounded transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 text-xs font-light rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-6">
                {/* Priority Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-light text-gray-500 uppercase tracking-wide">Priority:</span>
                  <div className="flex items-center gap-1">
                    {(['all', 'critical', 'high', 'medium', 'low'] as FilterPriority[]).map((priority) => (
                      <button
                        key={priority}
                        onClick={() => setFilterPriority(priority)}
                        className={`px-3 py-1 text-xs font-light rounded-full capitalize transition-colors ${
                          filterPriority === priority
                            ? 'bg-peach-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-light text-gray-500 uppercase tracking-wide">Type:</span>
                  <div className="flex items-center gap-1">
                    {(['all', 'priority', 'risk', 'opportunity', 'prediction', 'recommendation'] as FilterType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1 text-xs font-light rounded-full capitalize transition-colors ${
                          filterType === type
                            ? 'bg-peach-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results Count */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm font-light text-gray-600">
                  Showing {getFilteredInsights().length} of {insights.filter(i => i.status !== 'dismissed').length} insights
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 mb-6">
            <h3 className="text-lg font-normal text-red-900 mb-2">Error</h3>
            <p className="text-sm font-light text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && insights.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-peach-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm font-light text-gray-600">Loading insights...</p>
            </div>
          </div>
        ) : insights.length === 0 ? (
          // Empty State
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
            <div className="w-16 h-16 bg-peach-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-peach-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">No insights yet</h3>
            <p className="text-sm font-light text-gray-600 mb-6">
              Click "Generate New Insights" to analyze your pipeline with our AI engine
            </p>
            <button
              onClick={generateInsights}
              disabled={generating}
              className="px-6 py-3 bg-peach-500 text-white text-sm font-light rounded-lg hover:bg-peach-600 transition-colors disabled:opacity-50"
            >
              {generating ? 'Analyzing...' : 'Generate Insights'}
            </button>
          </div>
        ) : viewMode === 'table' ? (
          // Table View - Compact and Scalable
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[40%]">
                    Insight
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[12%]">
                    Priority
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[12%]">
                    Type
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[10%]">
                    Confidence
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[10%]">
                    Date
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[16%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredInsights().map((insight) => {
                  const priorityColors = {
                    critical: 'bg-red-100 text-red-700',
                    high: 'bg-orange-100 text-orange-700',
                    medium: 'bg-yellow-100 text-yellow-700',
                    low: 'bg-blue-100 text-blue-700',
                  };
                  const actions = typeof insight.actions === 'string' ? JSON.parse(insight.actions) : insight.actions;
                  const actionsList = Array.isArray(actions) ? actions : [];
                  const isExpanded = expandedInsight === insight.id;

                  return (
                    <>
                      <tr
                        key={insight.id}
                        onClick={() => toggleExpand(insight.id)}
                        className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-gray-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-normal text-gray-900 truncate">
                                  {insight.title}
                                </h3>
                                {insight.status === 'new' && (
                                  <span className="px-2 py-0.5 bg-peach-500 text-white text-xs font-light rounded-full flex-shrink-0">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-light text-gray-500 truncate mt-1">
                                {insight.description.substring(0, 100)}...
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-light capitalize ${
                            priorityColors[insight.priority as keyof typeof priorityColors]
                          }`}>
                            {insight.priority}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-light text-gray-700 capitalize">
                            {insight.type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-light text-gray-700">
                            {Math.round(insight.confidence * 100)}%
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-light text-gray-500">
                            {new Date(insight.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInsightAction(insight.id, 'actioned');
                              }}
                              disabled={insight.status === 'actioned'}
                              className="px-3 py-1.5 bg-peach-500 text-white text-xs font-light rounded hover:bg-peach-600 transition-colors disabled:opacity-50"
                            >
                              {insight.status === 'actioned' ? 'Done' : 'Action'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInsightAction(insight.id, 'dismissed');
                              }}
                              className="px-3 py-1.5 text-gray-600 border border-gray-200 text-xs font-light rounded hover:bg-gray-50 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${insight.id}-expanded`} className="border-t border-gray-100">
                          <td colSpan={6} className="px-0 py-0">
                            <div className="bg-gray-50 px-6 py-6">
                              {/* Full Description */}
                              <div className="mb-6">
                                <h4 className="text-xs font-light uppercase tracking-wide text-gray-500 mb-3">
                                  Full Description
                                </h4>
                                <p className="text-sm font-light text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {insight.description}
                                </p>
                              </div>

                              {/* Recommended Actions */}
                              {actionsList.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-light uppercase tracking-wide text-gray-500 mb-3">
                                    Recommended Actions
                                  </h4>
                                  <div className="space-y-2">
                                    {actionsList.map((action, index) => (
                                      <div key={index} className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-peach-500 text-white rounded flex items-center justify-center flex-shrink-0 text-xs font-normal">
                                          {index + 1}
                                        </div>
                                        <span className="text-sm font-light text-gray-700 leading-relaxed pt-0.5">
                                          {action}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          // Grid View - Visual Cards
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {getFilteredInsights().map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                expanded={expandedInsight === insight.id}
                onToggleExpand={() => toggleExpand(insight.id)}
                onAction={handleInsightAction}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
