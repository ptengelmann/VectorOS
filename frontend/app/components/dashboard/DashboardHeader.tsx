import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface DashboardHeaderProps {
  backendHealth: boolean;
  aiHealth: boolean;
  activePage?: 'dashboard' | 'insights' | 'deals' | 'forecast';
}

export default function DashboardHeader({ backendHealth, aiHealth, activePage = 'dashboard' }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-peach-500 rounded transition-all group-hover:rounded-xl" />
              <span className="text-xl font-light tracking-tight text-gray-900">VectorOS</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/dashboard"
                className={`text-sm font-light transition-colors pb-1 ${
                  activePage === 'dashboard'
                    ? 'text-peach-600 border-b-2 border-peach-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/forecast"
                className={`text-sm font-light transition-colors pb-1 ${
                  activePage === 'forecast'
                    ? 'text-peach-600 border-b-2 border-peach-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Forecast
              </Link>
              <Link
                href="/insights"
                className={`text-sm font-light transition-colors pb-1 ${
                  activePage === 'insights'
                    ? 'text-peach-600 border-b-2 border-peach-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                AI Insights
              </Link>
              <Link
                href="/deals"
                className={`text-sm font-light transition-colors pb-1 ${
                  activePage === 'deals'
                    ? 'text-peach-600 border-b-2 border-peach-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Deals
              </Link>
            </nav>
          </div>

          {/* Right: System Status & User */}
          <div className="flex items-center gap-6">
            <StatusIndicator label="Backend" healthy={backendHealth} />
            <StatusIndicator label="AI" healthy={aiHealth} />

            <div className="border-l border-gray-200 pl-6">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  }
                }}
                afterSignOutUrl="/"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusIndicator({ label, healthy }: { label: string; healthy: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-xs font-light text-gray-500">{label}</span>
    </div>
  );
}
