import React, { useState } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Moon, Plus, Clock, Star, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatsCard from '@/components/dashboard/StatsCard';
import ChartCard from '@/components/common/ChartCard';
import { PageTransition, staggerContainer, fadeUp } from '@/components/common/motion';
import { CHART_TOOLTIP, CHART_AXIS, CHART_GRID, CHART_COLORS } from '@/config/chart-config';

export default function Sleep() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bed_time: '22:00',
    wake_time: '06:00',
    sleep_quality: 3,
    notes: ''
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sleepLogs = [], isLoading } = useQuery({
    queryKey: ['sleepLogs'],
    queryFn: () => db.entities.SleepLog.list('-date', 30),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.SleepLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepLogs'] });
      setShowDialog(false);
      resetForm();
      toast({ title: 'Sleep log created successfully' });
    },
    onError: (error) => {
      console.error('Create sleep log failed:', error);
      toast({ title: 'Unable to create sleep log', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.SleepLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepLogs'] });
      setShowDialog(false);
      resetForm();
      toast({ title: 'Sleep log updated successfully' });
    },
    onError: (error) => {
      console.error('Update sleep log failed:', error);
      toast({ title: 'Unable to update sleep log', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.SleepLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepLogs'] });
      toast({ title: 'Sleep log deleted successfully' });
    },
    onError: (error) => {
      console.error('Delete sleep log failed:', error);
      toast({ title: 'Unable to delete sleep log', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      bed_time: '22:00',
      wake_time: '06:00',
      sleep_quality: 3,
      notes: ''
    });
    setEditingLog(null);
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setFormData({
      date: log.date,
      bed_time: log.bed_time || '22:00',
      wake_time: log.wake_time || '06:00',
      sleep_quality: log.sleep_quality || 3,
      notes: log.notes || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingLog) {
      updateMutation.mutate({ id: editingLog.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const calculateSleepHours = (bedTime, wakeTime) => {
    if (!bedTime || !wakeTime) return 0;
    const bed = new Date(`2000-01-01T${bedTime}`);
    const wake = new Date(`2000-01-01T${wakeTime}`);
    let diff = (wake - bed) / (1000 * 60 * 60);
    if (diff < 0) diff += 24;
    return diff;
  };

  const chartData = sleepLogs.slice(0, 14).reverse().map(log => ({
    date: format(parseISO(log.date), 'MMM d'),
    hours: calculateSleepHours(log.bed_time, log.wake_time),
    quality: (log.sleep_quality || 0) * 20
  }));

  const avgSleep = sleepLogs.length > 0
    ? sleepLogs.reduce((acc, log) => acc + calculateSleepHours(log.bed_time, log.wake_time), 0) / sleepLogs.length
    : 0;

  const avgQuality = sleepLogs.length > 0
    ? sleepLogs.reduce((acc, log) => acc + (log.sleep_quality || 0), 0) / sleepLogs.length
    : 0;

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Sleep Tracker"
          subtitle="Track your sleep patterns and improve rest"
          action={
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Log Sleep
            </Button>
          }
        />

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <motion.div variants={fadeUp}>
            <StatsCard title="Avg. Sleep" value={avgSleep} subtitle="hours / night" icon={Moon} color="indigo" />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatsCard title="Avg. Quality" value={avgQuality.toFixed(1)} subtitle="out of 5" icon={Star} color="amber" />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatsCard title="Last Bedtime" value={sleepLogs[0]?.bed_time || '--:--'} icon={Clock} color="blue" />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatsCard title="Logs Recorded" value={sleepLogs.length} icon={TrendingUp} color="emerald" />
          </motion.div>
        </motion.div>

        {chartData.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-5">
            <ChartCard title="Sleep Duration" subtitle="Hours per night" icon={Moon} tone="indigo">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="sleepDurationGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.indigo} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={CHART_COLORS.indigo} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="date" tick={CHART_AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} domain={[0, 12]} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Area type="monotone" dataKey="hours" stroke={CHART_COLORS.indigo} strokeWidth={2.5} fill="url(#sleepDurationGrad)" dot={false} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Sleep Quality" subtitle="Rated 1–5" icon={Star} tone="emerald">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="date" tick={CHART_AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => [`${value}%`, 'Quality']} cursor={{ fill: 'hsl(var(--chart-3) / 0.08)' }} />
                    <Bar dataKey="quality" fill={CHART_COLORS.emerald} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        )}

        {sleepLogs.length === 0 && !isLoading ? (
          <div className="bg-card rounded-3xl border border-border/60 shadow-soft">
            <EmptyState
              icon={Moon}
              title="No sleep logs yet"
              description="Start tracking your sleep to see patterns and improve rest quality"
              action={
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Log Sleep
                </Button>
              }
            />
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border/60 shadow-soft overflow-hidden">
            <div className="p-6 border-b border-border/60">
              <h3 className="font-semibold text-foreground">Recent Sleep Logs</h3>
            </div>
            <div className="divide-y divide-border/60">
              {sleepLogs.slice(0, 10).map((log) => {
                const hours = calculateSleepHours(log.bed_time, log.wake_time);
                return (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                        <Moon className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{format(parseISO(log.date), 'EEEE, MMM d')}</p>
                        <p className="text-sm text-muted-foreground">
                          {log.bed_time} → {log.wake_time} • {hours.toFixed(1)} hours
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "w-4 h-4",
                              star <= (log.sleep_quality || 0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(log)}>
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(log.id)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-rose-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingLog ? 'Edit Sleep Log' : 'Log Sleep'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Date</label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Bed Time</label>
                  <Input type="time" value={formData.bed_time} onChange={(e) => setFormData({ ...formData, bed_time: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Wake Time</label>
                  <Input type="time" value={formData.wake_time} onChange={(e) => setFormData({ ...formData, wake_time: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Sleep Quality</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setFormData({ ...formData, sleep_quality: star })} className="p-1 hover:scale-110 transition-transform">
                      <Star className={cn("w-8 h-8", star <= formData.sleep_quality ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Notes</label>
                <Textarea placeholder="How did you sleep?" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingLog ? 'Update' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}