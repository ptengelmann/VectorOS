/**
 * Deal AI Analysis Modal
 * Enterprise-grade AI-powered deal insights
 */

'use client';

import { useState, useEffect } from 'react';
import { Deal, DealAnalysis } from '@/lib/api-client';

interface DealAnalysisModalProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (deal: Deal) => Promise<DealAnalysis | null>;
}

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const SEVERITY_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

export default function DealAnalysisModal({ deal, isOpen, onClose, onAnalyze }: DealAnalysisModalProps) {
  const [analysis, setAnalysis] = useState<DealAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger analysis when modal opens with a new deal
  useEffect(() => {
    if (isOpen && deal && !analysis) {
      handleAnalyze();
    }
  }, [isOpen, deal]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAnalysis(null);
      setError(null);
    }
  }, [isOpen]);

  const handleAnalyze = async () => {
    if (!deal) return;

    setLoading(true);
    setError(null);

    try {
      const result = await onAnalyze(deal);
      if (result) {
        setAnalysis(result);
      } else {
        setError('Failed to analyze deal. Please try again.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !deal) return null;

  const analysisData = analysis?.analysis;
  const winProbability = analysisData?.win_probability || 0;

  // Calculate color based on win probability
  const getWinProbabilityColor = (prob: number) => {
    if (prob >= 75) return 'text-green-600';
    if (prob >= 50) return 'text-yellow-600';
    if (prob >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-peach-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-peach-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-normal text-gray-900">AI Deal Analysis</h2>
                    <p className="mt-1 text-sm font-light text-gray-500">
                      VectorOS Intelligence
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-8 py-6 space-y-6 overflow-y-auto">
            {/* Deal Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-lg font-normal text-gray-900 mb-2">{deal.title}</h3>
              <div className="flex items-center gap-4 text-sm font-light text-gray-600">
                <span>${deal.value.toLocaleString()}</span>
                <span>•</span>
                <span className="capitalize">{deal.stage.replace('_', ' ')}</span>
                {deal.company && (
                  <>
                    <span>•</span>
                    <span>{deal.company}</span>
                  </>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-peach-100 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-peach-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="mt-4 text-sm font-light text-gray-600">Analyzing deal with AI...</p>
                <p className="mt-1 text-xs font-light text-gray-400">This may take a few seconds</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-normal text-red-900">{error}</p>
                    <button
                      onClick={handleAnalyze}
                      className="mt-2 text-sm font-light text-red-700 hover:text-red-900 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {analysisData && !loading && (
              <div className="space-y-6">
                {/* Executive Summary */}
                <div className="bg-gradient-to-br from-peach-50 to-white border border-peach-100 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-peach-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Executive Summary</h3>
                      <p className="text-sm font-light text-gray-700 leading-relaxed">
                        {analysisData.executive_summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Win Probability */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Win Probability</h3>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={`text-5xl font-light ${getWinProbabilityColor(winProbability)}`}>
                        {winProbability.toFixed(1)}%
                      </div>
                      <div className="mt-1 text-xs font-light text-gray-500">
                        Confidence: {analysisData.confidence_level.toFixed(0)}%
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            winProbability >= 75 ? 'bg-green-500' :
                            winProbability >= 50 ? 'bg-yellow-500' :
                            winProbability >= 25 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${winProbability}%` }}
                        />
                      </div>
                      <p className="mt-3 text-sm font-light text-gray-600 leading-relaxed">
                        {analysisData.win_probability_reasoning}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                {analysisData.strengths.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Key Strengths</h3>
                    <div className="space-y-2">
                      {analysisData.strengths.map((strength, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-light text-gray-700">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {analysisData.risks.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Identified Risks</h3>
                    <div className="space-y-3">
                      {analysisData.risks.map((risk, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-normal text-gray-900">{risk.risk}</p>
                            <span className={`px-2 py-1 rounded text-xs font-light border ${SEVERITY_COLORS[risk.severity]}`}>
                              {risk.severity}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 mt-2">
                            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <p className="text-xs font-light text-gray-600">{risk.mitigation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Best Actions */}
                {analysisData.next_best_actions.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Recommended Next Actions</h3>
                    <div className="space-y-3">
                      {analysisData.next_best_actions.map((action, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-normal text-gray-900">{action.action}</p>
                            <span className={`px-2 py-1 rounded text-xs font-light border ${PRIORITY_COLORS[action.priority]}`}>
                              {action.priority}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                            <div>
                              <span className="text-gray-500 font-light">Expected Impact:</span>
                              <p className="text-gray-700 font-light mt-1">{action.expected_impact}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 font-light">Timeline:</span>
                              <p className="text-gray-700 font-light mt-1">{action.timeline}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitive Insights */}
                {analysisData.competitive_insights && analysisData.competitive_insights !== 'N/A' && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Competitive Insights</h3>
                    <p className="text-sm font-light text-gray-700 leading-relaxed">
                      {analysisData.competitive_insights}
                    </p>
                  </div>
                )}

                {/* Timing Analysis */}
                {analysisData.timing_analysis && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Timing Analysis</h3>
                    <p className="text-sm font-light text-gray-700 leading-relaxed">
                      {analysisData.timing_analysis}
                    </p>
                  </div>
                )}

                {/* Recommended Focus Areas */}
                {analysisData.recommended_focus_areas.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Focus Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.recommended_focus_areas.map((area, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-light rounded-lg border border-gray-200"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="text-xs font-light text-gray-400">
                    Analyzed {new Date(analysis.analyzed_at).toLocaleString()} • Model: {analysis.metadata.model}
                    {analysis.metadata.context_deals > 0 && ` • ${analysis.metadata.context_deals} deals analyzed for context`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-4 py-2 text-sm font-light text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                Re-analyze
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-peach-500 text-white text-sm font-light rounded-xl hover:bg-peach-600 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
