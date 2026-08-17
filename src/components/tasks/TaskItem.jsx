import React from 'react';

import { db } from '@/lib/supabaseApi';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Edit2, Trash2, Calendar, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { fadeUp } from '@/components/common/motion';

const PRIORITY_CONFIG = {
  high: { label: 'High', classes: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  medium: { label: 'Medium', classes: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  low: { label: 'Low', classes: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

export default function TaskItem({ task, onEdit, onDelete }) {
  const queryClient = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: () => db.entities.Task.update(task.id, { completed: !task.completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const due = task.due_date ? parseISO(task.due_date) : null;
  const overdue = due && !task.completed && isPast(due) && !isToday(due);

  return (
    <motion.div
      variants={fadeUp}
      className="group bg-card rounded-2xl border border-border/60 shadow-soft p-4 hover:shadow-premium transition-all"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => toggleMutation.mutate()}
          className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground/40 hover:text-muted-foreground" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-medium text-sm sm:text-base",
            task.completed ? "text-muted-foreground line-through" : "text-foreground"
          )}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", priority.classes)}>
              <Flag className="w-3 h-3" />
              {priority.label}
            </span>
            {due && (
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                overdue
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-muted text-muted-foreground"
              )}>
                <Calendar className="w-3 h-3" />
                {format(due, 'MMM d')}
                {isToday(due) && ' · Today'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => onEdit(task)} className="h-8 w-8">
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} className="h-8 w-8">
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-rose-500" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}