import React, { useState } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, ListTodo, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/common/PageHeader';
import { PageTransition, fadeUp, staggerContainer } from '../components/common/motion';
import TaskItem from '../components/tasks/TaskItem';
import TaskForm from '../components/tasks/TaskForm';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

export default function Tasks() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => db.entities.Task.list('-created_at', 200),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this task?')) return;
    deleteMutation.mutate(id);
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  });

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.length - activeCount;

  const stats = [
    { label: 'Total', value: tasks.length, icon: ListTodo, tone: 'blue' },
    { label: 'Active', value: activeCount, icon: Circle, tone: 'amber' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, tone: 'emerald' },
  ];

  const statTones = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
    amber: 'from-amber-400 to-amber-500 shadow-amber-500/25',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader title="Tasks" subtitle="Organize and track what needs to get done" />

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="bg-card rounded-3xl border border-border/60 shadow-soft p-5">
              <div className={cn("w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-3", statTones[s.tone])}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-2xl">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-sm font-medium transition-all",
                  filter === f.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button onClick={handleAdd} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
        </div>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
                <ListTodo className="w-7 h-7 opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {filter === 'completed' ? 'No completed tasks' : filter === 'active' ? 'No active tasks' : 'No tasks yet'}
              </p>
              <p className="text-sm mt-1">Tap "New Task" to add one</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
              {sorted.map((task) => (
                <TaskItem key={task.id} task={task} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <TaskForm open={showForm} onOpenChange={setShowForm} editingTask={editingTask} />
    </PageTransition>
  );
}