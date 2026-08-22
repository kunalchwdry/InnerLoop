import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '../common/motion';

const tones = {
  blue: { chip: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/25', bar: 'bg-blue-500' },
  indigo: { chip: 'from-indigo-500 to-indigo-600', glow: 'shadow-indigo-500/25', bar: 'bg-indigo-500' },
  emerald: { chip: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/25', bar: 'bg-emerald-500' },
  amber: { chip: 'from-amber-400 to-amber-500', glow: 'shadow-amber-500/25', bar: 'bg-amber-500' },
  rose: { chip: 'from-rose-500 to-rose-600', glow: 'shadow-rose-500/25', bar: 'bg-rose-500' },
  purple: { chip: 'from-violet-500 to-violet-600', glow: 'shadow-violet-500/25', bar: 'bg-violet-500' },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) {
  const tone = tones[color] || tones.blue;
  const isNumeric = typeof value === 'number';
  const decimals = Number.isInteger(value) ? 0 : 1;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative bg-card rounded-3xl p-6 border border-border/60 shadow-soft hover:shadow-premium transition-shadow duration-300 overflow-hidden"
    >
      <div className={cn("pointer-events-none absolute -right-10 -top-10 w-28 h-28 rounded-full bg-gradient-to-br blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500", tone.chip)} />

      <div className="relative flex items-start justify-between mb-6">
        <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", tone.chip, tone.glow)}>
          {Icon && <Icon className="w-6 h-6 text-white" />}
        </div>
        {trend != null && (
          <span className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full",
            trend >= 0
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
          )}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      <div className="relative space-y-1">
        <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {isNumeric ? <AnimatedCounter value={value} decimals={decimals} /> : value}
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground/70">{subtitle}</p>}
      </div>
    </motion.div>
  );
}