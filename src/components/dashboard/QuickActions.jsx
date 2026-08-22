import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/lib/utils';
import { Plus, Clock, Target, Moon, Dumbbell, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  { label: 'Add Habit', icon: Target, page: 'Habits', color: 'amber' },
  { label: 'Log Sleep', icon: Moon, page: 'Sleep', color: 'indigo' },
  { label: 'Schedule', icon: Clock, page: 'Timetable', color: 'blue' },
  { label: 'Workout', icon: Dumbbell, page: 'Exercise', color: 'emerald' },
  { label: 'Tasks', icon: ListTodo, page: 'Tasks', color: 'rose' },
];

const colorClasses = {
  amber: 'group/icon text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white',
  indigo: 'group/icon text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white',
  blue: 'group/icon text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white',
  emerald: 'group/icon text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white',
  rose: 'group/icon text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white',
};

const chipBg = {
  amber: 'bg-amber-50 dark:bg-amber-500/10 group-hover/icon:bg-white/20',
  indigo: 'bg-indigo-50 dark:bg-indigo-500/10 group-hover/icon:bg-white/20',
  blue: 'bg-blue-50 dark:bg-blue-500/10 group-hover/icon:bg-white/20',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/10 group-hover/icon:bg-white/20',
  rose: 'bg-rose-50 dark:bg-rose-500/10 group-hover/icon:bg-white/20',
};

export default function QuickActions() {
  return (
    <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-soft">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-foreground">Quick Actions</h3>
        <Plus className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {actions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              to={createPageUrl(action.page)}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-2xl border border-border/60 transition-all duration-300",
                colorClasses[action.color]
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300", chipBg[action.color])}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">{action.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}