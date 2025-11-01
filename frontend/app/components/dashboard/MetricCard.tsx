interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  trendUp?: boolean;
}

export default function MetricCard({ title, value, subtitle, trend, trendUp }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-peach-200 hover:shadow-sm transition-all">
      <div className="text-xs font-light text-gray-500 tracking-wide uppercase mb-3">{title}</div>
      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-3xl font-light text-gray-900">{value}</div>
        {trend && (
          <span className={`text-sm font-light ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="text-sm font-light text-gray-500">{subtitle}</div>
    </div>
  );
}
