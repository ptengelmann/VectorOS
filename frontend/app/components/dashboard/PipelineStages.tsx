interface PipelineStagesProps {
  stageDistribution: Record<string, number>;
  totalDeals: number;
}

export default function PipelineStages({ stageDistribution, totalDeals }: PipelineStagesProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-8">
      <h2 className="text-lg font-light text-gray-900 mb-6">Pipeline by Stage</h2>
      <div className="space-y-4">
        {Object.entries(stageDistribution).map(([stage, count]) => (
          <StageBar key={stage} stage={stage} count={count} total={totalDeals} />
        ))}
      </div>
    </div>
  );
}

function StageBar({ stage, count, total }: { stage: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  const stageColors: Record<string, string> = {
    lead: 'bg-gray-300',
    qualified: 'bg-blue-500',
    proposal: 'bg-yellow-500',
    negotiation: 'bg-orange-500',
    won: 'bg-green-500',
    lost: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-light text-gray-700 capitalize">{stage}</span>
        <span className="text-sm font-light text-gray-500">
          {count} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${stageColors[stage] || 'bg-gray-300'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
