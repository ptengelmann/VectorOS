/**
 * VectorOS Landing Page
 */

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Logo/Brand */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">
              VectorOS
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full" />
          </div>

          {/* Tagline */}
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            The Self-Growing Business Operating System
          </h2>

          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
            AI-powered intelligence that learns how your company runs, then automates growth,
            operations, and decision-making with enterprise-grade precision.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors shadow-xl"
            >
              Launch Dashboard →
            </Link>
            <a
              href="https://github.com/ptengelmann/VectorOS"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors border-2 border-blue-400"
            >
              View on GitHub
            </a>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon="🧠"
              title="AI-Powered Intelligence"
              description="Strategic Analyst and Deal Intelligence agents powered by Claude 3.5 Sonnet"
            />
            <FeatureCard
              icon="📊"
              title="Real-Time Analytics"
              description="Live pipeline metrics, conversion tracking, and predictive insights"
            />
            <FeatureCard
              icon="⚡"
              title="Enterprise Grade"
              description="Clean architecture, type-safe APIs, comprehensive logging and monitoring"
            />
          </div>

          {/* Tech Stack */}
          <div className="mt-20 pt-12 border-t border-blue-800">
            <h3 className="text-xl font-semibold text-blue-200 mb-6">Built With</h3>
            <div className="flex flex-wrap items-center justify-center gap-6 text-blue-100">
              <TechBadge>Next.js 14</TechBadge>
              <TechBadge>TypeScript</TechBadge>
              <TechBadge>Node.js</TechBadge>
              <TechBadge>Python</TechBadge>
              <TechBadge>FastAPI</TechBadge>
              <TechBadge>Anthropic Claude</TechBadge>
              <TechBadge>Prisma</TechBadge>
              <TechBadge>PostgreSQL</TechBadge>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-12">
            <SystemStatus />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-blue-100">{description}</p>
    </div>
  );
}

function TechBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-4 py-2 bg-blue-800/50 rounded-full text-sm font-medium border border-blue-600">
      {children}
    </span>
  );
}

function SystemStatus() {
  return (
    <div className="inline-flex items-center space-x-2 bg-green-500/20 border border-green-500 rounded-full px-4 py-2">
      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-sm font-medium text-green-100">All Systems Operational</span>
    </div>
  );
}
