/**
 * VectorOS AI Insights Dashboard - SCALABLE DESIGN
 * Deal-first approach with insights as drill-down
 */

'use client';

import React, { useEffect, useState } from 'react';
import { apiClient, type Insight } from '@/lib/api-client';
import DashboardHeader from '../components/dashboard/DashboardHeader';

type ViewMode = 'deals' | 'critical';

interface DealWithInsights {
  dealId: string;
  dealTitle: string;
  dealValue: number;
  dealStage: string;
  totalInsights: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  insights: Insight[];
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState(false);
  const [aiHealth, setAIHealth] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('deals');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    if (!storedWorkspaceId) {
      window.location.href = '/onboarding';
      return;
    }
    setWorkspaceId(storedWorkspaceId);
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
        setInsights(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error?.message || 'Failed to load insights');
        setInsights([]);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
      setError('Failed to load insights');
      setInsights([]);
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
      console.error('Error generating insights:', error);
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

  // Group insights by deal
  const getDealsWithInsights = (): DealWithInsights[] => {
    const dealsMap = new Map<string, DealWithInsights>();

    insights
      .filter(i => i.status !== 'dismissed')
      .filter(i => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          i.title.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query) ||
          i.data?.deal_title?.toLowerCase().includes(query)
        );
      })
      .forEach(insight => {
        const dealId = insight.dealId || insight.data?.deal_id || 'unknown';
        const dealTitle = insight.data?.deal_title || 'Unknown Deal';
        const dealValue = insight.data?.deal_value || 0;
        const dealStage = insight.data?.key_metrics?.stage || 'unknown';

        if (!dealsMap.has(dealId)) {
          dealsMap.set(dealId, {
            dealId,
            dealTitle,
            dealValue,
            dealStage,
            totalInsights: 0,
            criticalCount: 0,
            highCount: 0,
            mediumCount: 0,
            lowCount: 0,
            insights: []
          });
        }

        const deal = dealsMap.get(dealId)!;
        deal.totalInsights++;
        deal.insights.push(insight);

        if (insight.priority === 'critical') deal.criticalCount++;
        else if (insight.priority === 'high') deal.highCount++;
        else if (insight.priority === 'medium') deal.mediumCount++;
        else deal.lowCount++;
      });

    return Array.from(dealsMap.values()).sort((a, b) => {
      // Sort by: critical count desc, then high count desc, then total insights desc
      if (a.criticalCount !== b.criticalCount) return b.criticalCount - a.criticalCount;
      if (a.highCount !== b.highCount) return b.highCount - a.highCount;
      return b.totalInsights - a.totalInsights;
    });
  };

  const getCriticalInsights = () => {
    return insights
      .filter(i => i.status !== 'dismissed')
      .filter(i => i.priority === 'critical' || i.priority === 'high')
      .sort((a, b) => {
        if (a.priority === 'critical' && b.priority !== 'critical') return -1;
        if (a.priority !== 'critical' && b.priority === 'critical') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 20); // Top 20 critical/high
  };

  const deals = getDealsWithInsights();
  const criticalInsights = getCriticalInsights();
  const selectedDealData = deals.find(d => d.dealId === selectedDeal);

  const totalInsights = insights.filter(i => i.status !== 'dismissed').length;
  const totalCritical = insights.filter(i => i.status !== 'dismissed' && i.priority === 'critical').length;
  const totalHigh = insights.filter(i => i.status !== 'dismissed' && i.priority === 'high').length;

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
                {totalInsights} insights across {deals.length} deals ({totalCritical} critical, {totalHigh} high priority)
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

          {/* View Mode Toggle & Search */}
          {insights.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between gap-4">
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
                      placeholder="Search deals or insights..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-light focus:outline-none focus:ring-2 focus:ring-peach-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('deals')}
                    className={`px-4 py-2 text-sm font-light rounded transition-colors ${
                      viewMode === 'deals'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    By Deal ({deals.length})
                  </button>
                  <button
                    onClick={() => setViewMode('critical')}
                    className={`px-4 py-2 text-sm font-light rounded transition-colors ${
                      viewMode === 'critical'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Critical Only ({criticalInsights.length})
                  </button>
                </div>
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
        ) : viewMode === 'deals' ? (
          // DEALS VIEW - Scalable for 5000 deals
          <div className="grid grid-cols-1 gap-4">
            {deals.map((deal) => (
              <div
                key={deal.dealId}
                className="bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all overflow-hidden"
              >
                {/* Deal Header - Always Visible */}
                <div
                  onClick={() => setSelectedDeal(selectedDeal === deal.dealId ? null : deal.dealId)}
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-normal text-gray-900">{deal.dealTitle}</h3>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-light rounded capitalize">
                        {deal.dealStage}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-light text-gray-600">
                        ${deal.dealValue.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {deal.criticalCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-light rounded">
                            {deal.criticalCount} Critical
                          </span>
                        )}
                        {deal.highCount > 0 && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-light rounded">
                            {deal.highCount} High
                          </span>
                        )}
                        {deal.mediumCount > 0 && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-light rounded">
                            {deal.mediumCount} Medium
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-light text-gray-900">{deal.totalInsights}</div>
                      <div className="text-xs font-light text-gray-500">Insights</div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        selectedDeal === deal.dealId ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Insights */}
                {selectedDeal === deal.dealId && selectedDealData && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <div className="space-y-4">
                      {selectedDealData.insights.map((insight) => {
                        const priorityColors = {
                          critical: 'border-red-200 bg-red-50',
                          high: 'border-orange-200 bg-orange-50',
                          medium: 'border-yellow-200 bg-yellow-50',
                          low: 'border-blue-200 bg-blue-50',
                        };

                        const actions = typeof insight.actions === 'string' ? JSON.parse(insight.actions) : insight.actions;
                        const actionsList = Array.isArray(actions) ? actions : [];

                        return (
                          <div
                            key={insight.id}
                            className={`border-2 rounded-lg p-5 ${
                              priorityColors[insight.priority as keyof typeof priorityColors] || 'border-gray-200 bg-white'
                            }`}
                          >
                            {/* Insight Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-base font-normal text-gray-900">{insight.title}</h4>
                                  {insight.status === 'new' && (
                                    <span className="px-2 py-0.5 bg-peach-500 text-white text-xs font-light rounded-full">
                                      New
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-light text-gray-700 leading-relaxed">
                                  {insight.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <span className="px-2 py-1 bg-white rounded text-xs font-light text-gray-600 capitalize">
                                  {insight.priority}
                                </span>
                                <span className="px-2 py-1 bg-white rounded text-xs font-light text-gray-600">
                                  {Math.round(insight.confidence * 100)}%
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            {actionsList.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h5 className="text-xs font-light uppercase tracking-wide text-gray-500 mb-3">
                                  Recommended Actions
                                </h5>
                                <div className="space-y-2">
                                  {actionsList.map((action, index) => {
                                    const actionText = typeof action === 'string' ? action : action.action;
                                    const actionTimeline = typeof action === 'object' ? action.timeline : null;

                                    return (
                                      <div key={index} className="flex items-start gap-2 bg-white rounded p-3">
                                        <div className="w-5 h-5 bg-peach-500 text-white rounded flex items-center justify-center flex-shrink-0 text-xs font-normal">
                                          {index + 1}
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-light text-gray-700">{actionText}</p>
                                          {actionTimeline && (
                                            <p className="text-xs font-light text-gray-500 mt-1">{actionTimeline}</p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                              <button
                                onClick={() => handleInsightAction(insight.id, 'actioned')}
                                disabled={insight.status === 'actioned'}
                                className="px-4 py-2 bg-peach-500 text-white text-xs font-light rounded hover:bg-peach-600 transition-colors disabled:opacity-50"
                              >
                                {insight.status === 'actioned' ? 'Actioned ✓' : 'Take Action'}
                              </button>
                              <button
                                onClick={() => handleInsightAction(insight.id, 'dismissed')}
                                className="px-4 py-2 text-gray-600 border border-gray-300 text-xs font-light rounded hover:bg-gray-50 transition-colors"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // CRITICAL ONLY VIEW - Top 20 most important
          <div className="space-y-4">
            {criticalInsights.map((insight) => {
              const priorityColors = {
                critical: 'border-red-200 bg-red-50',
                high: 'border-orange-200 bg-orange-50',
              };

              const actions = typeof insight.actions === 'string' ? JSON.parse(insight.actions) : insight.actions;
              const actionsList = Array.isArray(actions) ? actions : [];

              return (
                <div
                  key={insight.id}
                  className={`border-2 rounded-xl p-6 ${
                    priorityColors[insight.priority as keyof typeof priorityColors] || 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Deal Context */}
                  {insight.data?.deal_title && (
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <a
                        href="/deals"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-light hover:bg-blue-200 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {insight.data.deal_title}
                        {insight.data?.deal_value && (
                          <span className="text-xs">
                            (${insight.data.deal_value.toLocaleString()})
                          </span>
                        )}
                      </a>
                    </div>
                  )}

                  {/* Insight Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-normal text-gray-900">{insight.title}</h4>
                        {insight.status === 'new' && (
                          <span className="px-2 py-0.5 bg-peach-500 text-white text-xs font-light rounded-full">
                            New
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-light capitalize ${
                          insight.priority === 'critical'
                            ? 'bg-red-500 text-white'
                            : 'bg-orange-500 text-white'
                        }`}>
                          {insight.priority}
                        </span>
                      </div>
                      <p className="text-sm font-light text-gray-700 leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-white rounded text-sm font-light text-gray-600 ml-4">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>

                  {/* Actions */}
                  {actionsList.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h5 className="text-xs font-light uppercase tracking-wide text-gray-500 mb-3">
                        Recommended Actions
                      </h5>
                      <div className="space-y-2">
                        {actionsList.map((action, index) => {
                          const actionText = typeof action === 'string' ? action : action.action;
                          const actionTimeline = typeof action === 'object' ? action.timeline : null;

                          return (
                            <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-3">
                              <div className="w-6 h-6 bg-peach-500 text-white rounded flex items-center justify-center flex-shrink-0 text-xs font-normal">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-light text-gray-700">{actionText}</p>
                                {actionTimeline && (
                                  <p className="text-xs font-light text-gray-500 mt-1">{actionTimeline}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleInsightAction(insight.id, 'actioned')}
                      disabled={insight.status === 'actioned'}
                      className="px-5 py-2.5 bg-peach-500 text-white text-sm font-light rounded-lg hover:bg-peach-600 transition-colors disabled:opacity-50"
                    >
                      {insight.status === 'actioned' ? 'Actioned ✓' : 'Take Action'}
                    </button>
                    <button
                      onClick={() => handleInsightAction(insight.id, 'dismissed')}
                      className="px-5 py-2.5 text-gray-600 border border-gray-300 text-sm font-light rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Dismiss
                    </button>
                    <span className="ml-auto text-xs font-light text-gray-400">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
