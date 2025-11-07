/**
 * ML Risk Badge Component
 * Displays XGBoost model risk assessment for deals
 */

import { Sparkles, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MLRiskBadgeProps {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  winProbability: number;
  confidence: number;
  compact?: boolean;
  showProbability?: boolean;
}

const riskConfig = {
  low: {
    label: 'Low Risk',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    gradient: 'from-emerald-500/10 to-emerald-500/5',
  },
  medium: {
    label: 'Medium Risk',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: TrendingUp,
    gradient: 'from-amber-500/10 to-amber-500/5',
  },
  high: {
    label: 'High Risk',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: TrendingDown,
    gradient: 'from-orange-500/10 to-orange-500/5',
  },
  critical: {
    label: 'Critical Risk',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertTriangle,
    gradient: 'from-red-500/10 to-red-500/5',
  },
};

export default function MLRiskBadge({
  riskLevel,
  winProbability,
  confidence,
  compact = false,
  showProbability = true,
}: MLRiskBadgeProps) {
  const config = riskConfig[riskLevel];
  const Icon = config.icon;
  const probabilityPercent = Math.round(winProbability * 100);
  const confidencePercent = Math.round(confidence * 100);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${config.bg} ${config.border}`}
        title={`${probabilityPercent}% win probability (${confidencePercent}% confidence)`}
      >
        <Icon className="h-3 w-3" />
        <span>{probabilityPercent}%</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border ${config.border} bg-gradient-to-br ${config.gradient} backdrop-blur-sm`}>
      {/* AI Sparkle indicator */}
      <div className="absolute top-2 right-2">
        <Sparkles className={`h-3.5 w-3.5 ${config.color} opacity-60`} />
      </div>

      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-2 rounded-lg ${config.bg}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-semibold ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs text-gray-500">
                AI Prediction
              </span>
            </div>

            {showProbability && (
              <div className="space-y-2">
                {/* Win probability bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Win Probability</span>
                    <span className={`font-semibold ${config.color}`}>
                      {probabilityPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        riskLevel === 'critical' ? 'bg-red-500' :
                        riskLevel === 'high' ? 'bg-orange-500' :
                        riskLevel === 'medium' ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${probabilityPercent}%` }}
                    />
                  </div>
                </div>

                {/* Confidence indicator */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Model Confidence</span>
                  <span className="text-gray-700 font-medium">
                    {confidencePercent}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline version for tables
 */
export function MLRiskBadgeCompact({
  riskLevel,
  winProbability,
}: Omit<MLRiskBadgeProps, 'confidence' | 'compact' | 'showProbability'>) {
  return (
    <MLRiskBadge
      riskLevel={riskLevel}
      winProbability={winProbability}
      confidence={0}
      compact={true}
      showProbability={false}
    />
  );
}
