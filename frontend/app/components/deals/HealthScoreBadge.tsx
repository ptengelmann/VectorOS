/**
 * Health Score Badge Component
 * Visual indicator for deal health with tooltip
 */

import type { DealScore } from '@/lib/api-client';

interface HealthScoreBadgeProps {
  score: number;
  status: DealScore['health_status'];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusColors = {
  excellent: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: 'text-green-500',
  },
  good: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-500',
  },
  fair: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: 'text-yellow-500',
  },
  poor: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: 'text-orange-500',
  },
  critical: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-500',
  },
};

const sizeClasses = {
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    labelText: 'text-xs',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-sm',
    labelText: 'text-sm',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-base',
    labelText: 'text-base',
  },
};

export default function HealthScoreBadge({
  score,
  status,
  size = 'md',
  showLabel = false
}: HealthScoreBadgeProps) {
  const colors = statusColors[status] || statusColors.fair;
  const sizes = sizeClasses[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizes.container} rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center transition-all hover:scale-105`}
        title={`Health Score: ${score}/100 (${status})`}
      >
        <span className={`${sizes.text} font-semibold ${colors.text}`}>
          {Math.round(score)}
        </span>
      </div>

      {showLabel && (
        <div className="flex flex-col">
          <span className={`${sizes.labelText} font-light ${colors.text} capitalize`}>
            {status}
          </span>
          <span className="text-xs font-light text-gray-500">
            Health Score
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Health Score Indicator (for table rows)
 */
export function HealthScoreIndicator({ score, status }: { score: number; status: DealScore['health_status'] }) {
  const colors = statusColors[status] || statusColors.fair;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg} border ${colors.border}`}
      title={`Health Score: ${score}/100`}
    >
      <div className={`w-2 h-2 rounded-full ${colors.icon} bg-current`} />
      <span className={`text-xs font-light ${colors.text}`}>
        {Math.round(score)}
      </span>
    </div>
  );
}

/**
 * Health Score Progress Bar
 */
export function HealthScoreBar({ score, status }: { score: number; status: DealScore['health_status'] }) {
  const colors = statusColors[status] || statusColors.fair;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-light text-gray-600">Health Score</span>
        <span className={`text-xs font-semibold ${colors.text} capitalize`}>
          {Math.round(score)} - {status}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.icon} bg-current transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
