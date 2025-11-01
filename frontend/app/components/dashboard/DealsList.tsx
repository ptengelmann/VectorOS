import type { Deal } from '@/lib/api-client';

interface DealsListProps {
  deals: Deal[];
}

export default function DealsList({ deals }: DealsListProps) {
  if (deals.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-light text-gray-900 mb-2">No deals yet</h3>
        <p className="text-sm font-light text-gray-500">Create your first deal to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-100">
        <h2 className="text-lg font-light text-gray-900">Recent Deals</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {deals.map((deal) => (
          <DealRow key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}

function DealRow({ deal }: { deal: Deal }) {
  const stageColors: Record<string, string> = {
    lead: 'bg-gray-50 text-gray-700 border-gray-200',
    qualified: 'bg-blue-50 text-blue-700 border-blue-200',
    proposal: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    negotiation: 'bg-orange-50 text-orange-700 border-orange-200',
    won: 'bg-green-50 text-green-700 border-green-200',
    lost: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="px-8 py-6 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-normal text-gray-900 mb-1">{deal.title}</h3>
          <div className="flex items-center gap-3 text-sm font-light text-gray-500">
            {deal.company && <span>{deal.company}</span>}
            {deal.contactName && (
              <>
                <span>·</span>
                <span>{deal.contactName}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm font-normal text-gray-900">
              ${deal.value?.toLocaleString() || '0'}
            </div>
            {deal.probability && (
              <div className="text-xs font-light text-gray-500">{deal.probability}% probability</div>
            )}
          </div>
          <span
            className={`px-3 py-1.5 border rounded-lg text-xs font-light capitalize ${
              stageColors[deal.stage] || stageColors.lead
            }`}
          >
            {deal.stage}
          </span>
        </div>
      </div>
    </div>
  );
}
