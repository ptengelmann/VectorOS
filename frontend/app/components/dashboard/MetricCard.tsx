'use client';

import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  trendUp?: boolean;
  index?: number;
}

export default function MetricCard({ title, value, subtitle, trend, trendUp, index = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-peach-200 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="text-xs font-light text-gray-500 tracking-wide uppercase mb-3">{title}</div>
      <div className="flex items-baseline gap-2 mb-2">
        <motion.div
          className="text-3xl font-light text-gray-900"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.2, type: "spring", stiffness: 200 }}
        >
          {value}
        </motion.div>
        {trend && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
            className={`text-sm font-light ${trendUp ? 'text-green-600' : 'text-red-600'}`}
          >
            {trend}
          </motion.span>
        )}
      </div>
      <div className="text-sm font-light text-gray-500">{subtitle}</div>
    </motion.div>
  );
}
