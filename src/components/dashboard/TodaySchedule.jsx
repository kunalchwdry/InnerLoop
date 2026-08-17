import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeStyles = {
  study: { dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  exercise: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  habit: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  work: { dot: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' },
  break: { dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300' },
  other: { dot: 'bg-slate-500', chip: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300' },
};

export default function TodaySchedule({ slots = [], onToggleComplete }) {
  const sortedSlots = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const completed = sortedSlots.filter(s => s.completed).length;

  return (
    <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-soft transition-colors">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Today's Schedule</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(), 'EEEE, MMM d')}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          {completed}/{sortedSlots.length} done
        </span>
      </div>

      {sortedSlots.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
            <Calendar className="w-7 h-7 opacity-50" />
          </div>
          <p className="text-sm font-medium">No activities scheduled</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Your day is wide open.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 -mr-1">
          {sortedSlots.map((slot, i) => {
            const style = typeStyles[slot.type] || typeStyles.other;
            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200",
                  slot.completed
                    ? "bg-muted/50 border-transparent"
                    : "bg-transparent border-border/50 hover:border-border hover:bg-muted/40"
                )}
              >
                <div className={cn("w-1 h-11 rounded-full", style.dot)} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    slot.completed ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {slot.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {slot.start_time} – {slot.end_time}
                  </p>
                </div>
                <button
                  onClick={() => onToggleComplete?.(slot)}
                  className={cn(
                    "p-1.5 rounded-lg transition-all hover:scale-110",
                    slot.completed ? "text-emerald-500" : "text-muted-foreground/40 hover:text-foreground"
                  )}
                >
                  {slot.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}