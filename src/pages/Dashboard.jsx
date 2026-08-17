import React, { useState, useEffect } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Target, Moon, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import QuickActions from '@/components/dashboard/QuickActions';
import TodaySchedule from '@/components/dashboard/TodaySchedule';
import HabitProgress from '@/components/dashboard/HabitProgress';
import WeeklyInsights from '@/components/dashboard/WeeklyInsights';
import MotivationCard from '@/components/dashboard/MotivationCard';
import { PageTransition, fadeUp, staggerContainer } from '@/components/common/motion';

export default function Dashboard() {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => db.entities.Habit.list(),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs', today],
    queryFn: () => db.entities.HabitLog.filter({ date: today }),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: timetableSlots = [] } = useQuery({
    queryKey: ['timetableSlots', today],
    queryFn: () => db.entities.TimetableSlot.filter({ date: today }),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: sleepLogs = [] } = useQuery({
    queryKey: ['sleepLogs'],
    queryFn: () => db.entities.SleepLog.list('-date', 7),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'active'],
    queryFn: () => db.entities.Task.filter({ completed: false }),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habit, completed }) => {
      const existingLog = habitLogs.find(log => log.habit_id === habit.id && log.date === today);
      if (existingLog) {
        return db.entities.HabitLog.update(existingLog.id, { completed });
      } else {
        return db.entities.HabitLog.create({
          habit_id: habit.id,
          date: today,
          completed,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
    },
  });

  const toggleSlotMutation = useMutation({
    mutationFn: async (slot) => {
      return db.entities.TimetableSlot.update(slot.id, { completed: !slot.completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetableSlots'] });
    },
  });

  const completedHabitsToday = habitLogs.filter(log => log.completed).length;
  const completedSlotsToday = timetableSlots.filter(s => s.completed).length;
  const avgSleepHours = sleepLogs.length > 0
    ? sleepLogs.reduce((acc, log) => {
        if (log.bed_time && log.wake_time) {
          const bed = new Date(`2000-01-01T${log.bed_time}`);
          const wake = new Date(`2000-01-01T${log.wake_time}`);
          let diff = (wake - bed) / (1000 * 60 * 60);
          if (diff < 0) diff += 24;
          return acc + diff;
        }
        return acc;
      }, 0) / sleepLogs.length
    : 0;

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <PageTransition>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
        {/* Hero greeting */}
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-white/10 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-premium"
        >
          <div className="absolute inset-0 bg-grid-dark opacity-20 pointer-events-none" />
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-20 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-xl">
                  <span className="text-white font-bold text-xl">IL</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium text-white/90 border border-white/10">
                  <Sparkles className="w-3.5 h-3.5" />
                  {format(new Date(), 'EEEE, MMMM d')}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {greeting}, {firstName}
              </h1>
              <p className="text-blue-100/80 mt-2 text-base">
                Here's your InnerLoop for today — let's make it count.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold tabular-nums">
                  {habits.length > 0 ? Math.round((completedHabitsToday / habits.length) * 100) : 0}%
                </div>
                <p className="text-xs text-blue-100/70 mt-1">Day progress</p>
              </div>
              <div className="w-px h-12 bg-white/15" />
              <div className="text-center">
                <div className="text-4xl font-bold tabular-nums">{tasks.length}</div>
                <p className="text-xs text-blue-100/70 mt-1">Open tasks</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard
            title="Habits Completed"
            value={`${completedHabitsToday}/${habits.length}`}
            icon={Target}
            color="blue"
          />
          <StatsCard
            title="Sleep Average"
            value={avgSleepHours}
            subtitle="hours / night"
            icon={Moon}
            color="indigo"
          />
          <StatsCard
            title="Schedule Done"
            value={`${completedSlotsToday}/${timetableSlots.length}`}
            icon={Clock}
            color="emerald"
          />
          <StatsCard
            title="Pending Tasks"
            value={tasks.length}
            icon={CheckCircle2}
            color="amber"
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp}>
          <QuickActions />
        </motion.div>

        {/* Main Content Grid */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-5">
          <TodaySchedule
            slots={timetableSlots}
            onToggleComplete={(slot) => toggleSlotMutation.mutate(slot)}
          />
          <HabitProgress
            habits={habits}
            logs={habitLogs}
            onToggle={(habit, completed) => toggleHabitMutation.mutate({ habit, completed })}
          />
        </motion.div>

        {/* Insights + Motivation */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <WeeklyInsights sleepLogs={sleepLogs} />
          </div>
          <MotivationCard />
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}