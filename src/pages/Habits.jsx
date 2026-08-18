import React, { useState } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Target, Plus, Check, Flame, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ChartCard from '@/components/common/ChartCard';
import { PageTransition, fadeUp, staggerContainer } from '@/components/common/motion';
import { CHART_TOOLTIP, CHART_AXIS, CHART_GRID, CHART_COLORS } from '@/config/chart-config';

const HABIT_ICONS = ['🎯', '💪', '📚', '🧘', '💧', '🏃', '🍎', '✍️', '🎵', '🧠'];

export default function Habits() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: '🎯', frequency: 'daily' });
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const { toast } = useToast();

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: () => db.entities.Habit.list(),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ['allHabitLogs'],
    queryFn: () => db.entities.HabitLog.list('-date', 500),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Habit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setShowDialog(false);
      resetForm();
      toast({ title: 'Habit created successfully' });
    },
    onError: (error) => {
      console.error('Create habit failed:', error);
      toast({ title: 'Unable to create habit', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Habit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setShowDialog(false);
      resetForm();
      toast({ title: 'Habit updated successfully' });
    },
    onError: (error) => {
      console.error('Update habit failed:', error);
      toast({ title: 'Unable to update habit', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Habit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast({ title: 'Habit deleted successfully' });
    },
    onError: (error) => {
      console.error('Delete habit failed:', error);
      toast({ title: 'Unable to delete habit', description: error.message, variant: 'destructive' });
    },
  });

  const toggleLogMutation = useMutation({
    mutationFn: async ({ habitId, date, completed }) => {
      const existingLog = allLogs.find(log => log.habit_id === habitId && log.date === date);
      if (existingLog) {
        return db.entities.HabitLog.update(existingLog.id, { completed });
      } else {
        return db.entities.HabitLog.create({ habit_id: habitId, date, completed });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allHabitLogs'] });
    },
    onError: (error) => {
      console.error('Toggle habit log failed:', error);
      toast({ title: 'Unable to update habit log', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', icon: '🎯', frequency: 'daily' });
    setEditingHabit(null);
  };

  const handleEdit = (habit) => {
    setEditingHabit(habit);
    setFormData({ name: habit.name, icon: habit.icon || '🎯', frequency: habit.frequency || 'daily' });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (editingHabit) {
      updateMutation.mutate({ id: editingHabit.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStreak = (habitId) => {
    let streak = 0;
    const sortedLogs = allLogs
      .filter(log => log.habit_id === habitId && log.completed)
      .map(log => log.date)
      .sort((a, b) => b.localeCompare(a));

    let currentDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      if (sortedLogs.includes(dateStr)) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else if (dateStr !== today) {
        break;
      } else {
        currentDate = subDays(currentDate, 1);
      }
    }
    return streak;
  };

  const getLast7Days = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return { date, dateStr: format(date, 'yyyy-MM-dd'), dayName: format(date, 'EEE') };
    });
  };

  const isCompleted = (habitId, dateStr) => {
    return allLogs.some(log => log.habit_id === habitId && log.date === dateStr && log.completed);
  };

  const last7Days = getLast7Days();

  const weeklyData = last7Days.map(({ dateStr, dayName }) => {
    const completedCount = habits.filter(h => isCompleted(h.id, dateStr)).length;
    return {
      day: dayName,
      completed: completedCount,
      total: habits.length,
      percentage: habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0
    };
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Habits"
          subtitle="Build consistency with daily habits"
          action={
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> New Habit
            </Button>
          }
        />

        {habits.length > 0 && (
          <ChartCard title="Weekly Progress" subtitle="Completion rate over the last 7 days" icon={Target} tone="amber">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="day" tick={CHART_AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'hsl(var(--chart-4) / 0.08)' }} />
                  <Bar dataKey="percentage" fill={CHART_COLORS.amber} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {habits.length === 0 && !isLoading ? (
          <div className="bg-card rounded-3xl border border-border/60 shadow-soft">
            <EmptyState
              icon={Target}
              title="No habits yet"
              description="Start building positive habits by creating your first one"
              action={
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create Habit
                </Button>
              }
            />
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
            {habits.map((habit) => {
              const streak = getStreak(habit.id);
              return (
                <motion.div
                  key={habit.id}
                  variants={fadeUp}
                  className="bg-card rounded-3xl border border-border/60 shadow-soft p-6 hover:shadow-premium transition-shadow duration-300"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">
                        {habit.icon || '🎯'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{habit.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Flame className="w-4 h-4 text-amber-500" />
                          <span className="text-sm text-muted-foreground">
                            {streak} day streak
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(habit)}>
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(habit.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-rose-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-muted/50 rounded-2xl p-3">
                    {last7Days.map(({ date, dateStr, dayName }) => {
                      const completed = isCompleted(habit.id, dateStr);
                      const isToday = dateStr === today;
                      return (
                        <button
                          key={dateStr}
                          onClick={() => toggleLogMutation.mutate({ habitId: habit.id, date: dateStr, completed: !completed })}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <span className={cn(
                            "text-xs font-medium",
                            isToday ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                          )}>
                            {dayName}
                          </span>
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                            completed
                              ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-500/30"
                              : isToday
                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-300/60 dark:ring-amber-500/30"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}>
                            {completed ? <Check className="w-4 h-4" /> : <span className="text-xs">{format(date, 'd')}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingHabit ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Habit Name</label>
                <Input
                  placeholder="e.g., Morning meditation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setFormData({ ...formData, icon })}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                        formData.icon === icon
                          ? "bg-amber-100 dark:bg-amber-500/20 ring-2 ring-amber-500"
                          : "bg-muted hover:bg-muted/70"
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Frequency</label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>
                {editingHabit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}