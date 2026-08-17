import React from 'react';
import { motion } from 'framer-motion';
import { Target, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HabitProgress({ habits = [], logs = [], onToggle }) {
  const today = new Date().toISOString().split('T')[0];

  const getHabitStatus = (habitId) =>
    logs.some(log => log.habit_id === habitId && log.date === today && log.completed);

  const completedCount = habits.filter(h => getHabitStatus(h.id)).length;
  const progress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;

  return (
    <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-soft transition-colors">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Today's Habits</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Keep the streak alive</p>
        </div>
        <span className="text-sm font-semibold text-primary">
          {completedCount}/{habits.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 bg-muted rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
        />
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
            <Target className="w-7 h-7 opacity-50" />
          </div>
          <p className="text-sm font-medium">No habits yet</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Start building a routine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {habits.slice(0, 6).map((habit, i) => {
            const isCompleted = getHabitStatus(habit.id);
            return (
              <motion.button
                key={habit.id}
                onClick={() => onToggle?.(habit, !isCompleted)}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200",
                  isCompleted
                    ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20 text-amber-600 dark:text-amber-400"
                    : "bg-transparent border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  isCompleted ? "bg-amber-100 dark:bg-amber-500/20" : "bg-muted"
                )}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-lg">{habit.icon || '🎯'}</span>
                  )}
                </div>
                <span className="text-xs font-medium truncate w-full text-center">
                  {habit.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}