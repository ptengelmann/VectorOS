/**
 * VectorOS AI Insights Dashboard
 * Claude-powered business intelligence and recommendations
 */

'use client';

import { useEffect, useState } from 'react';
import { apiClient, type Insight } from '@/lib/api-client';

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    if (!storedWorkspaceId) {
      setError('No workspace found. Please complete onboarding first.');
      setLoading(false);
      return;
    }
    setWorkspaceId(storedWorkspaceId);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    loadInsights();
  }, [workspaceId]);

  const loadInsights = async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getInsights(workspaceId);
      if (response.success && response.data) {
        setInsights(response.data);
      } else {
        setError(response.error?.message || 'Failed to load insights');
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
      setError('Failed to load insights');
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
        // Update local state
        setInsights(insights.map(i => i.id === insightId ? { ...i, status: action } : i));
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
      // Mark as viewed when expanded
      const insight = insights.find(i => i.id === insightId);
      if (insight?.status === 'new') {
        handleInsightAction(insightId, 'viewed');
      }
    }
  };

  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const typeIcons = {
    priority: '🎯',
    risk: '⚠️',
    opportunity: '💎',
    prediction: '🔮',
    recommendation: '💡',
  };

  const getInsightsByPriority = () => {
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    return insights
      .filter(i => i.status !== 'dismissed')
      .sort((a, b) => {
        const aPriority = priorityOrder.indexOf(a.priority);
        const bPriority = priorityOrder.indexOf(b.priority);
        return aPriority - bPriority;
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
                <span>🧠</span>
                <span>AI Insights</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Claude-powered business intelligence and recommendations
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={loadInsights}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={generateInsights}
                disabled={generating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center space-x-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate New Insights</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">Error</h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading && insights.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading insights...</p>
            </div>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No insights yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Click "Generate New Insights" to analyze your pipeline with Claude AI
            </p>
            <button
              onClick={generateInsights}
              disabled={generating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {generating ? 'Analyzing...' : '✨ Generate Insights'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Insights Count */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {insights.filter(i => i.status !== 'dismissed').length} active insights
              </div>
              <div className="flex items-center space-x-2">
                {['critical', 'high', 'medium', 'low'].map(priority => {
                  const count = insights.filter(i => i.priority === priority && i.status !== 'dismissed').length;
                  if (count === 0) return null;
                  return (
                    <span
                      key={priority}
                      className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        priorityColors[priority as keyof typeof priorityColors]
                      }`}
                    >
                      {priority}: {count}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Insights List */}
            <div className="space-y-4">
              {getInsightsByPriority().map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  expanded={expandedInsight === insight.id}
                  onToggleExpand={() => toggleExpand(insight.id)}
                  onAction={handleInsightAction}
                  priorityColors={priorityColors}
                  typeIcons={typeIcons}
                />
              ))}
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

function InsightCard({
  insight,
  expanded,
  onToggleExpand,
  onAction,
  priorityColors,
  typeIcons,
}: {
  insight: Insight;
  expanded: boolean;
  onToggleExpand: () => void;
  onAction: (insightId: string, action: 'viewed' | 'actioned' | 'dismissed') => void;
  priorityColors: Record<string, string>;
  typeIcons: Record<string, string>;
}) {
  const actions = typeof insight.actions === 'string'
    ? JSON.parse(insight.actions)
    : insight.actions;

  const actionsList = Array.isArray(actions) ? actions : [];

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border-2 transition-all ${
        priorityColors[insight.priority as keyof typeof priorityColors]
      } ${expanded ? 'ring-2 ring-blue-500' : ''}`}
    >
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">{typeIcons[insight.type as keyof typeof typeIcons] || '💡'}</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {insight.title}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                priorityColors[insight.priority as keyof typeof priorityColors]
              }`}>
                {insight.priority}
              </span>
              {insight.status === 'new' && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  New
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {insight.description}
            </p>
          </div>
          <div className="ml-4 flex items-center space-x-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(insight.confidence * 100)}% confidence
            </div>
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'transform rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Full Description */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Analysis
            </h4>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {insight.description}
            </p>
          </div>

          {/* Actions */}
          {actionsList.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Recommended Actions
              </h4>
              <ul className="space-y-2">
                {actionsList.map((action, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">→</span>
                    <span className="text-gray-700 dark:text-gray-300">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(insight.id, 'actioned');
              }}
              disabled={insight.status === 'actioned'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {insight.status === 'actioned' ? '✓ Actioned' : 'Mark as Actioned'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(insight.id, 'dismissed');
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              Dismiss
            </button>
            <div className="flex-1 text-right text-xs text-gray-500 dark:text-gray-400">
              Generated {new Date(insight.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
