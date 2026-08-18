import React, { useState } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';

import { useQuery } from '@tanstack/react-query';
import { format, subDays, parseISO } from 'date-fns';
import { Target, Moon, Clock, BookOpen, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PageHeader from '@/components/common/PageHeader';
import ChartCard from '@/components/common/ChartCard';
import { PageTransition, fadeUp, staggerContainer } from '@/components/common/motion';
import { CHART_TOOLTIP, CHART_AXIS, CHART_GRID, CHART_COLORS, PIE_COLORS } from '@/config/chart-config';
import { cn } from '@/lib/utils';

export default function Analytics() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const [timeRange, setTimeRange] = useState('week');

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => db.entities.Habit.list(),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['allHabitLogs'],
    queryFn: () => db.entities.HabitLog.list('-date', 500),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: sleepLogs = [] } = useQuery({
    queryKey: ['sleepLogs'],
    queryFn: () => db.entities.SleepLog.list('-date', 100),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: timetableSlots = [] } = useQuery({
    queryKey: ['allTimetableSlots'],
    queryFn: () => db.entities.TimetableSlot.list('-date', 500),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => db.entities.Topic.list(),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: exerciseLogs = [] } = useQuery({
    queryKey: ['exerciseLogs'],
    queryFn: () => db.entities.ExerciseLog.list('-date', 100),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const getLast7Days = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return { date, dateStr: format(date, 'yyyy-MM-dd'), dayName: format(date, 'EEE') };
    });
  };

  const getLast30Days = () => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return { date, dateStr: format(date, 'yyyy-MM-dd'), dayName: format(date, 'MMM d') };
    });
  };

  const days = timeRange === 'week' ? getLast7Days() : getLast30Days();

  const habitChartData = days.map(({ dateStr, dayName }) => {
    const dayLogs = habitLogs.filter(log => log.date === dateStr);
    const completed = dayLogs.filter(log => log.completed).length;
    return {
      day: dayName,
      completed,
      total: habits.length,
      percentage: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0
    };
  });

  const habitDistribution = habits.map(habit => {
    const completedCount = habitLogs.filter(log => log.habit_id === habit.id && log.completed).length;
    return { name: habit.name, value: completedCount };
  }).filter(h => h.value > 0);

  const calculateSleepHours = (bedTime, wakeTime) => {
    if (!bedTime || !wakeTime) return 0;
    const bed = new Date(`2000-01-01T${bedTime}`);
    const wake = new Date(`2000-01-01T${wakeTime}`);
    let diff = (wake - bed) / (1000 * 60 * 60);
    if (diff < 0) diff += 24;
    return diff;
  };

  const sleepChartData = sleepLogs.slice(0, timeRange === 'week' ? 7 : 30).reverse().map(log => ({
    date: format(parseISO(log.date), timeRange === 'week' ? 'EEE' : 'MMM d'),
    hours: calculateSleepHours(log.bed_time, log.wake_time),
    quality: (log.sleep_quality || 0) * 20
  }));

  const productivityData = days.map(({ dateStr, dayName }) => {
    const daySlots = timetableSlots.filter(s => s.date === dateStr);
    const completed = daySlots.filter(s => s.completed).length;
    return {
      day: dayName,
      planned: daySlots.length,
      completed,
      percentage: daySlots.length > 0 ? Math.round((completed / daySlots.length) * 100) : 0
    };
  });

  const completedTopics = topics.filter(t => t.completed).length;
  const pendingTopics = topics.length - completedTopics;
  const studyProgress = topics.length > 0 ? Math.round((completedTopics / topics.length) * 100) : 0;

  const exerciseData = days.map(({ dateStr, dayName }) => {
    const dayExercises = exerciseLogs.filter(log => log.date === dateStr && log.completed);
    return { day: dayName, count: dayExercises.length };
  });

  const ranges = [
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'Last 30 Days' },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader title="Analytics" subtitle="Track your progress and stay motivated" />

        <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-2xl">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                timeRange === r.id
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid lg:grid-cols-2 gap-5">
          <motion.div variants={fadeUp}>
            <ChartCard title="Habit Completion Rate" icon={Target} tone="blue">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={habitChartData}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="day" tick={CHART_AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'hsl(var(--chart-1) / 0.08)' }} />
                    <Bar dataKey="percentage" fill={CHART_COLORS.blue} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ChartCard title="Habit Distribution" icon={Target} tone="emerald">
              <div className="h-72 flex items-center justify-center">
                {habitDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={habitDistribution}
                        cx="50%" cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        innerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {habitDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CHART_TOOLTIP} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No habit data available</p>
                )}
              </div>
            </ChartCard>
          </motion.div>
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid lg:grid-cols-2 gap-5">
          <motion.div variants={fadeUp}>
            <ChartCard title="Sleep Duration" icon={Moon} tone="indigo">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sleepChartData}>
                    <defs>
                      <linearGradient id="analyticsSleepGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.indigo} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={CHART_COLORS.indigo} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="date" tick={CHART_AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} domain={[0, 12]} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Area type="monotone" dataKey="hours" stroke={CHART_COLORS.indigo} strokeWidth={2.5} fill="url(#analyticsSleepGrad)" dot={false} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ChartCard title="Sleep Quality" icon={Moon} tone="emerald">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepChartData}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="date" tick={CHART_AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => [`${value}%`, 'Quality']} cursor={{ fill: 'hsl(var(--chart-3) / 0.08)' }} />
                    <Bar dataKey="quality" fill={CHART_COLORS.emerald} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </motion.div>
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid lg:grid-cols-2 gap-5">
          <motion.div variants={fadeUp}>
            <ChartCard title="Productivity Rate" icon={Clock} tone="amber">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productivityData}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="day" tick={CHART_AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Line type="monotone" dataKey="completed" stroke={CHART_COLORS.amber} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="planned" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ChartCard title="Study Progress" icon={BookOpen} tone="blue">
              <div className="h-72 flex flex-col items-center justify-center">
                <div className="relative w-44 h-44">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="88" cy="88" r="80" stroke="hsl(var(--muted))" strokeWidth="12" fill="none" />
                    <motion.circle
                      cx="88" cy="88" r="80" stroke={CHART_COLORS.blue} strokeWidth="12" fill="none"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 80}
                      initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - studyProgress / 100) }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-foreground tabular-nums">{studyProgress}%</span>
                    <span className="text-sm text-muted-foreground mt-1">Completed</span>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 w-full">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{completedTopics}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{pendingTopics}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </div>
            </ChartCard>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <ChartCard title="Exercise Frequency" icon={Dumbbell} tone="emerald">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exerciseData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="day" tick={CHART_AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'hsl(var(--chart-3) / 0.08)' }} />
                  <Bar dataKey="count" fill={CHART_COLORS.emerald} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>
      </div>
    </PageTransition>
  );
}