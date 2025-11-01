import Link from 'next/link';

export default function AIInsightsCard() {
  return (
    <Link
      href="/insights"
      className="block bg-peach-500 rounded-2xl p-8 text-white hover:bg-peach-600 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-light mb-1">AI Insights Dashboard</h3>
            <p className="text-sm font-light text-white/80">
              Get Claude AI-powered recommendations and strategic analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 bg-white text-peach-600 rounded-lg text-sm font-light group-hover:bg-white/95 transition-colors">
          View Insights
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
