import Link from 'next/link';

export default function CTA() {
  return (
    <section className="py-24 px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="relative bg-gradient-to-br from-peach-500 to-peach-600 rounded-3xl p-16 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h2 className="text-5xl font-extralight tracking-tight text-white mb-6 leading-tight">
              Ready to transform
              <br />
              <span className="font-light">your business?</span>
            </h2>
            <p className="text-lg font-light text-white/90 mb-8 leading-relaxed">
              Join thousands of companies using VectorOS to automate workflows and scale faster.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-3.5 bg-white text-peach-600 text-sm font-light tracking-wide rounded hover:bg-gray-50 transition-all"
              >
                Start Free Trial
              </Link>
              <Link
                href="#contact"
                className="px-8 py-3.5 border border-white/30 text-white text-sm font-light tracking-wide rounded hover:bg-white/10 transition-all"
              >
                Talk to Sales
              </Link>
            </div>
            <p className="mt-6 text-xs font-light text-white/70">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
