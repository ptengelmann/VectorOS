import type { Insight } from '@/lib/api-client';

interface InsightCardProps {
  insight: Insight;
  expanded: boolean;
  onToggleExpand: () => void;
  onAction: (insightId: string, action: 'viewed' | 'actioned' | 'dismissed') => void;
}

const priorityColors = {
  critical: 'border-red-200 bg-red-50',
  high: 'border-orange-200 bg-orange-50',
  medium: 'border-yellow-200 bg-yellow-50',
  low: 'border-blue-200 bg-blue-50',
};

const priorityIconColors = {
  critical: 'bg-red-100 text-red-600',
  high: 'bg-orange-100 text-orange-600',
  medium: 'bg-yellow-100 text-yellow-600',
  low: 'bg-blue-100 text-blue-600',
};

const typeIcons = {
  priority: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  risk: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  opportunity: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  prediction: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  recommendation: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

export default function InsightCard({ insight, expanded, onToggleExpand, onAction }: InsightCardProps) {
  const actions = typeof insight.actions === 'string' ? JSON.parse(insight.actions) : insight.actions;
  const actionsList = Array.isArray(actions) ? actions : [];

  return (
    <div
      className={`bg-white border-2 rounded-2xl transition-all overflow-hidden ${
        priorityColors[insight.priority as keyof typeof priorityColors] || 'border-gray-200'
      } ${expanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
    >
      {/* Header - Always Visible */}
      <div className="p-8 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-start gap-6">
          {/* Left: Priority Icon Box */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            priorityIconColors[insight.priority as keyof typeof priorityIconColors]
          }`}>
            {typeIcons[insight.type as keyof typeof typeIcons] || typeIcons.recommendation}
          </div>

          {/* Center: Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-normal text-gray-900">{insight.title}</h3>
              {insight.status === 'new' && (
                <span className="px-2.5 py-1 bg-peach-500 text-white text-xs font-light rounded-full flex-shrink-0">
                  New
                </span>
              )}
            </div>

            {/* Deal Context */}
            {insight.data?.deal_title && (
              <div className="flex items-center gap-2 mb-3">
                <a
                  href="/deals"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-light hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {insight.data.deal_title}
                </a>
                {insight.data?.deal_value && (
                  <span className="text-xs font-light text-gray-500">
                    ${insight.data.deal_value.toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Metadata Badges */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-light capitalize ${
                priorityColors[insight.priority as keyof typeof priorityColors]
              }`}>
                {insight.priority} Priority
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-light">
                {Math.round(insight.confidence * 100)}% Confidence
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-light capitalize">
                {insight.type}
              </span>
            </div>

            {/* Preview Description */}
            {!expanded && (
              <p className="text-sm font-light text-gray-600 line-clamp-2 leading-relaxed">
                {insight.description}
              </p>
            )}
          </div>

          {/* Right: Expand Arrow */}
          <div className="flex-shrink-0 pt-1">
            <div className={`w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center transition-all ${
              expanded ? 'rotate-180 bg-peach-100' : ''
            }`}>
              <svg
                className={`w-5 h-5 transition-colors ${expanded ? 'text-peach-600' : 'text-gray-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t-2 border-gray-100">
          {/* Full Description */}
          <div className="px-8 py-6 bg-gray-50">
            <h4 className="text-xs font-light uppercase tracking-wide text-gray-500 mb-3">Details</h4>
            <p className="text-sm font-light text-gray-700 leading-relaxed whitespace-pre-wrap">
              {insight.description}
            </p>
          </div>

          {/* Recommended Actions */}
          {actionsList.length > 0 && (
            <div className="px-8 py-6 bg-white">
              <h4 className="text-xs font-light uppercase tracking-wide text-gray-500 mb-4">
                Recommended Actions
              </h4>
              <div className="space-y-3">
                {actionsList.map((action, index) => {
                  const actionText = typeof action === 'string' ? action : action.action;
                  const actionPriority = typeof action === 'object' ? action.priority : null;
                  const actionTimeline = typeof action === 'object' ? action.timeline : null;
                  const actionImpact = typeof action === 'object' ? action.expected_impact : null;

                  return (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start gap-4">
                        <div className="w-7 h-7 mt-0.5 bg-peach-500 text-white rounded-lg flex items-center justify-center flex-shrink-0 font-normal text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-normal text-gray-900 leading-relaxed">
                            {actionText}
                          </p>
                          {(actionPriority || actionTimeline) && (
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              {actionPriority && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs font-light text-gray-600">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/>
                                  </svg>
                                  <span className="capitalize">{actionPriority}</span>
                                </span>
                              )}
                              {actionTimeline && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs font-light text-gray-600">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {actionTimeline}
                                </span>
                              )}
                            </div>
                          )}
                          {actionImpact && (
                            <p className="text-xs font-light text-gray-500 mt-2">
                              <span className="font-normal">Impact:</span> {actionImpact}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-8 py-6 bg-gray-50 border-t-2 border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(insight.id, 'actioned');
                }}
                disabled={insight.status === 'actioned'}
                className="px-6 py-2.5 bg-peach-500 text-white text-sm font-light rounded-lg hover:bg-peach-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {insight.status === 'actioned' ? 'Actioned ✓' : 'Take Action'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(insight.id, 'dismissed');
                }}
                className="px-6 py-2.5 text-gray-600 bg-white border border-gray-300 text-sm font-light rounded-lg hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
            <span className="text-xs font-light text-gray-400">
              {new Date(insight.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
