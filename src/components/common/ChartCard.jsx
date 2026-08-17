import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const tones = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/25',
  emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
  amber: 'from-amber-400 to-amber-500 shadow-amber-500/25',
  rose: 'from-rose-500 to-rose-600 shadow-rose-500/25',
  purple: 'from-violet-500 to-violet-600 shadow-violet-500/25',
  slate: 'from-slate-500 to-slate-600 shadow-slate-500/25',
};

export default function ChartCard({ title, subtitle, icon: Icon, tone = 'blue', action, children, className, bodyClassName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("bg-card rounded-3xl p-6 border border-border/60 shadow-soft", className)}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", tones[tone])}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </motion.div>
  );
}