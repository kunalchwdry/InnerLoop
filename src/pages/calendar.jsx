import React, { useState } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';

import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Target, Moon, Clock, Dumbbell, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageTransition } from '@/components/common/motion';

export default function Calendar() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayDialog, setShowDayDialog] = useState(false);

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

  const { data: exerciseLogs = [] } = useQuery({
    queryKey: ['exerciseLogs'],
    queryFn: () => db.entities.ExerciseLog.list('-date', 100),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  const getDayData = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayHabitLogs = habitLogs.filter(log => log.date === dateStr);
    const completedHabits = dayHabitLogs.filter(log => log.completed).length;
    const totalHabits = habits.length;
    const daySleep = sleepLogs.find(log => log.date === dateStr);
    const daySlots = timetableSlots.filter(slot => slot.date === dateStr);
    const completedSlots = daySlots.filter(slot => slot.completed).length;
    const dayExercise = exerciseLogs.filter(log => log.date === dateStr);

    return {
      habits: { completed: completedHabits, total: totalHabits },
      sleep: daySleep,
      schedule: { completed: completedSlots, total: daySlots.length, items: daySlots },
      exercise: dayExercise.length,
    };
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setShowDayDialog(true);
  };

  const selectedDayData = selectedDate ? getDayData(selectedDate) : null;

  const legend = [
    { color: 'bg-emerald-500', label: 'Habits (80%+)' },
    { color: 'bg-violet-500', label: 'Sleep' },
    { color: 'bg-blue-500', label: 'Schedule' },
    { color: 'bg-emerald-500', label: 'Exercise' },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader title="Calendar" subtitle="View your daily history and progress" />

        <div className="bg-card rounded-3xl border border-border/60 shadow-soft p-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-semibold text-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-xl">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {paddedDays.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="aspect-square" />;

              const isToday = isSameDay(day, new Date());
              const dayData = getDayData(day);
              const hasActivity = dayData.habits.completed > 0 || dayData.sleep || dayData.schedule.total > 0 || dayData.exercise > 0;
              const habitProgress = dayData.habits.total > 0 ? (dayData.habits.completed / dayData.habits.total) * 100 : 0;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "aspect-square p-1 rounded-2xl transition-all hover:bg-muted/60 relative",
                    isToday && "ring-2 ring-primary"
                  )}
                >
                  <div className={cn(
                    "w-full h-full rounded-xl flex flex-col items-center justify-center gap-1",
                    isToday && "bg-primary/10"
                  )}>
                    <span className={cn(
                      "text-sm font-medium",
                      isToday ? "text-primary" : "text-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>

                    {hasActivity && (
                      <div className="flex items-center gap-0.5">
                        {dayData.habits.completed > 0 && (
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            habitProgress >= 80 ? "bg-emerald-500" : habitProgress >= 50 ? "bg-amber-500" : "bg-rose-400"
                          )} />
                        )}
                        {dayData.sleep && <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                        {dayData.schedule.total > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        {dayData.exercise > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-border/60">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", l.color)} />
                <span className="text-sm text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : ''}
              </DialogTitle>
            </DialogHeader>

            {selectedDayData && (
              <div className="space-y-3 py-2">
                <DaySection icon={Target} tone="amber" title="Habits">
                  <p className="text-sm text-muted-foreground">
                    {selectedDayData.habits.completed} of {selectedDayData.habits.total} completed
                  </p>
                </DaySection>

                <DaySection icon={Moon} tone="violet" title="Sleep">
                  {selectedDayData.sleep ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedDayData.sleep.bed_time} → {selectedDayData.sleep.wake_time} • Quality: {selectedDayData.sleep.sleep_quality}/5
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/70">No sleep data logged</p>
                  )}
                </DaySection>

                <DaySection icon={Clock} tone="blue" title="Schedule">
                  {selectedDayData.schedule.total > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedDayData.schedule.completed} of {selectedDayData.schedule.total} completed
                      </p>
                      {selectedDayData.schedule.items.map((slot) => (
                        <div key={slot.id} className="flex items-center gap-2 text-sm">
                          {slot.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground/40" />
                          )}
                          <span className={slot.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                            {slot.start_time} - {slot.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/70">No activities scheduled</p>
                  )}
                </DaySection>

                <DaySection icon={Dumbbell} tone="emerald" title="Exercise">
                  <p className="text-sm text-muted-foreground">
                    {selectedDayData.exercise} workout{selectedDayData.exercise !== 1 ? 's' : ''} logged
                  </p>
                </DaySection>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

const sectionTones = {
  amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function DaySection({ icon: Icon, tone, title, children }) {
  return (
    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", sectionTones[tone])}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-medium text-foreground text-sm">{title}</span>
      </div>
      {children}
    </div>
  );
}