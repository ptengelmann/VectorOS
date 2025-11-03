'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1], // Custom easing for smooth motion
      },
    },
  };

  const statsVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: 0.8,
      },
    },
  };

  return (
    <section className="relative pt-32 pb-24 px-8 overflow-hidden bg-white">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-peach-50 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-peach-100 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="inline-block px-4 py-1.5 bg-peach-50 text-peach-600 text-xs font-light tracking-wide rounded-full"
            >
              ENTERPRISE AI PLATFORM
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-6xl lg:text-7xl font-extralight tracking-tight text-gray-900 leading-[1.1]"
            >
              The AI Operating
              <br />
              <span className="font-light text-peach-500">System For Your</span>
              <br />
              Business
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg font-light text-gray-600 leading-relaxed max-w-xl"
            >
              Automate workflows, gain predictive insights, and scale faster with enterprise-grade AI
              that learns how your company works.
            </motion.p>

            <motion.div variants={itemVariants} className="flex items-center gap-4 pt-4">
              <Link
                href="/sign-up"
                className="px-8 py-3.5 bg-peach-500 text-white text-sm font-light tracking-wide rounded hover:bg-peach-600 transition-all hover:shadow-lg hover:scale-105 active:scale-100"
              >
                Start Free Trial
              </Link>
              <Link
                href="/sign-in"
                className="px-8 py-3.5 border border-gray-200 text-gray-900 text-sm font-light tracking-wide rounded hover:border-gray-300 transition-all hover:shadow-md"
              >
                Sign In
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={statsVariants}
              className="flex items-center gap-12 pt-8 border-t border-gray-100"
            >
              <div>
                <div className="text-3xl font-light text-gray-900">2.5x</div>
                <div className="text-xs font-light text-gray-500 tracking-wide">FASTER WORKFLOWS</div>
              </div>
              <div>
                <div className="text-3xl font-light text-gray-900">94%</div>
                <div className="text-xs font-light text-gray-500 tracking-wide">ACCURACY RATE</div>
              </div>
              <div>
                <div className="text-3xl font-light text-gray-900">$2.4M</div>
                <div className="text-xs font-light text-gray-500 tracking-wide">AVG SAVINGS</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Visual */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="relative bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Mockup of dashboard */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-3 bg-gray-200 rounded" />
                  <div className="w-16 h-3 bg-peach-200 rounded" />
                </div>

                <div className="space-y-2">
                  <div className="h-32 bg-gradient-to-br from-peach-50 to-peach-100 rounded-lg" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-20 bg-gray-50 rounded" />
                    <div className="h-20 bg-gray-50 rounded" />
                    <div className="h-20 bg-peach-50 rounded" />
                  </div>
                </div>

                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <div className="w-8 h-8 bg-peach-200 rounded" />
                      <div className="flex-1 space-y-1.5">
                        <div className="w-3/4 h-2 bg-gray-200 rounded" />
                        <div className="w-1/2 h-2 bg-gray-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                className="absolute -top-4 -right-4 px-4 py-2 bg-peach-500 text-white text-xs font-light rounded-lg shadow-lg"
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                AI-Powered
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
