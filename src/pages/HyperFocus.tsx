import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import {
  Zap,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle,
  Clock,
  Target,
  Trophy,
  BarChart2,
  Plus,
  Minus,
  Settings,
  X,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
};

type FocusSession = {
  id: string;
  task_id: string;
  duration: number;
  started_at: string;
  ended_at: string | null;
  completed: boolean;
  created_at: string;
};

type DurationOption = { value: number; label: string };

const DURATION_OPTIONS: DurationOption[] = [
  { value: 25, label: '25 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 90, label: '90 minutes' },
];

export default function HyperFocus() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Task selection
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  // Session state
  const [duration, setDuration] = useState(45);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  // Timer state
  const [phase, setPhase] = useState<'select' | 'ready' | 'running' | 'paused' | 'complete'>('select');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [sessionTaskId, setSessionTaskId] = useState<string | null>(null);
  const [completedDuration, setCompletedDuration] = useState(0);

  // Analytics
  const [todaysFocusMinutes, setTodaysFocusMinutes] = useState(0);
  const [todaysSessions, setTodaysSessions] = useState(0);
  const [todaysCompleted, setTodaysCompleted] = useState(0);
  const [avgSessionMinutes, setAvgSessionMinutes] = useState(0);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
  }, []);

  // Load tasks
  useEffect(() => {
    loadTasks();
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    setIsLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('created_by_id', user.id)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTasks(data || []);
      
      // Auto-select first task if none selected
      if (data && data.length > 0 && !selectedTaskId) {
        setSelectedTaskId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Load today's analytics
  useEffect(() => {
    loadTodaysAnalytics();
  }, [user]);

  const loadTodaysAnalytics = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('created_by_id', user.id)
        .gte('started_at', `${today}T00:00:00`)
        .lte('started_at', `${today}T23:59:59`);

      if (error) throw error;
      
      const sessions = data || [];
      const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
      const completed = sessions.filter(s => s.completed).length;
      
      setTodaysFocusMinutes(totalMinutes);
      setTodaysSessions(sessions.length);
      setTodaysCompleted(completed);
      setAvgSessionMinutes(sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Timer logic
  useEffect(() => {
    if (phase === 'running') {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSelectedTask = () => tasks.find(t => t.id === selectedTaskId);

  const handleStartSession = () => {
    if (!selectedTaskId) return;
    
    const sessionDuration = isCustomDuration ? parseInt(customDuration) || duration : duration;
    setTimeRemaining(sessionDuration * 60);
    setSessionStartTime(Date.now());
    setSessionTaskId(selectedTaskId);
    setPhase('ready');
    
    // Brief delay then start
    setTimeout(() => setPhase('running'), 500);
  };

  const handlePause = () => {
    setPhase('paused');
    setPausedAt(Date.now());
  };

  const handleResume = () => {
    setPhase('running');
    setPausedAt(null);
  };

  const handleEndSession = async (completed: boolean) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const actualDuration = completed ? Math.floor((duration * 60 - timeRemaining) / 60) : Math.floor((duration * 60 - timeRemaining) / 60);
    
    if (sessionTaskId && sessionStartTime && actualDuration > 0) {
      await saveSession(sessionTaskId, actualDuration, completed);
    }

    if (completed) {
      setCompletedDuration(actualDuration);
      setPhase('complete');
      playCompletionSound();
    } else {
      setPhase('select');
    }
    
    setTimeRemaining(0);
    setSessionStartTime(null);
    setPausedAt(null);
    loadTodaysAnalytics();
  };

  const handleTimerComplete = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const actualDuration = duration;
    
    if (sessionTaskId && sessionStartTime) {
      await saveSession(sessionTaskId, actualDuration, true);
    }

    setCompletedDuration(actualDuration);
    setPhase('complete');
    playCompletionSound();
    loadTodaysAnalytics();
  };

  const saveSession = async (taskId: string, sessionDuration: number, completed: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('focus_sessions')
        .insert({
          task_id: taskId,
          duration: sessionDuration,
          started_at: new Date(sessionStartTime!).toISOString(),
          ended_at: new Date().toISOString(),
          completed,
          created_by_id: user.id,
        });

      if (error) throw error;
      
      // If task was completed, mark it as done
      if (completed) {
        await supabase
          .from('tasks')
          .update({ completed: true })
          .eq('id', taskId)
          .eq('created_by_id', user.id);
      }
    } catch (error) {
      console.error('Error saving session:', error);
      toast({ title: 'Error', description: 'Failed to save session', variant: 'destructive' });
    }
  };

  const playCompletionSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleNewSession = () => {
    setPhase('select');
    setSelectedTaskId(null);
    setCompletedDuration(0);
    loadTasks();
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const selectedTask = getSelectedTask();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Zap className="w-8 h-8 text-amber-500" />
            HyperFocus
          </h1>
          <p className="text-muted-foreground mt-1">
            Deep work sessions. One task at a time.
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{formatMinutes(todaysFocusMinutes)}</p>
                <p className="text-xs text-muted-foreground">Today's Focus</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{todaysSessions}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{todaysCompleted}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{formatMinutes(avgSessionMinutes)}</p>
                <p className="text-xs text-muted-foreground">Avg Session</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase: Select Task */}
      {phase === 'select' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Select a Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground mb-4">No active tasks found</p>
                  <Button variant="outline" onClick={loadTasks} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                  {tasks.map(task => (
                    <motion.button
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 text-left transition-all",
                        selectedTaskId === task.id
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:border-primary/40 hover:bg-muted/50"
                      )}
                    >
                      {selectedTaskId === task.id && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          task.priority === 'high' && "bg-rose-100 dark:bg-rose-900/30 text-rose-500",
                          task.priority === 'medium' && "bg-amber-100 dark:bg-amber-900/30 text-amber-500",
                          task.priority === 'low' && "bg-green-100 dark:bg-green-900/30 text-green-500"
                        )}>
                          <Zap className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground truncate mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="capitalize">{task.priority} priority</span>
                            {task.due_date && (
                              <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedTask && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Session Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Task: <span className="text-foreground font-medium">{selectedTask.title}</span></p>
                  <p className="text-sm text-muted-foreground">Choose your focus duration:</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <Button
                      key={opt.value}
                      variant={!isCustomDuration && duration === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setIsCustomDuration(false); setDuration(opt.value); }}
                      className="gap-1"
                    >
                      {opt.label}
                    </Button>
                  ))}
                  <Button
                    variant={isCustomDuration ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsCustomDuration(true)}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Custom
                  </Button>
                </div>

                {isCustomDuration && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="5"
                      max="180"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      placeholder="Minutes"
                      className="w-[120px]"
                    />
                    <span className="text-muted-foreground">minutes</span>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleStartSession}
                  disabled={isCustomDuration && (!customDuration || parseInt(customDuration) < 5)}
                >
                  <Play className="w-5 h-5" />
                  <span>Start {isCustomDuration ? customDuration : duration} min Focus Session</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Phase: Ready (brief countdown) */}
      {phase === 'ready' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Get Ready to Focus</h2>
          <p className="text-muted-foreground mb-6">{selectedTask?.title}</p>
          <div className="text-4xl font-mono font-bold text-primary">{formatTime(timeRemaining)}</div>
        </motion.div>
      )}

      {/* Phase: Running / Paused */}
      {(phase === 'running' || phase === 'paused') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Timer */}
          <Card className="bg-gradient-to-br from-card to-muted/50 border-primary/20">
            <CardContent className="pt-6 pb-8 px-6 text-center">
              <div className="mb-4">
                <span className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                  phase === 'running'
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                )}>
                  {phase === 'running' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Focusing
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Paused
                    </>
                  )}
                </span>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">{selectedTask?.title}</p>
                <div className="font-mono text-6xl font-bold text-foreground tracking-tight">
                  {formatTime(timeRemaining)}
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                {phase === 'running' ? (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handlePause}
                    className="w-[140px] gap-2"
                  >
                    <Pause className="w-5 h-5" />
                    <span>Pause</span>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleResume}
                    className="w-[140px] gap-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Resume</span>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => handleEndSession(false)}
                  className="w-[140px] gap-2"
                >
                  <Square className="w-5 h-5" />
                  <span>End Session</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Encouragement */}
          <div className="text-center">
            <p className={cn(
              "text-lg font-medium transition-colors",
              phase === 'running' ? "text-primary" : "text-amber-500"
            )}>
              {phase === 'running' 
                ? "Stay focused. One task at a time." 
                : "Take a breath. Resume when ready."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Phase: Complete */}
      {phase === 'complete' && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Focus Session Complete 🎯</h2>
            
            <Card className="max-w-md mx-auto mb-6">
              <CardContent className="pt-6 pb-8 px-6 space-y-3">
                <div className="flex items-center justify-center gap-4 text-center">
                  <div className="flex flex-col items-center">
                    <p className="text-2xl font-bold text-foreground">{selectedTask?.title}</p>
                    <p className="text-sm text-muted-foreground">Task</p>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div className="flex flex-col items-center">
                    <p className="text-2xl font-bold text-foreground">{formatMinutes(completedDuration)}</p>
                    <p className="text-sm text-muted-foreground">Focused for</p>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div className="flex flex-col items-center">
                    <p className="text-2xl font-bold text-green-500">Completed</p>
                    <p className="text-sm text-muted-foreground">Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-muted-foreground mb-6">
              Great work! You've made progress on your task.
            </p>

            <Button
              size="lg"
              onClick={handleNewSession}
              className="gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Start Another Session</span>
            </Button>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Future: Screen Analysis Notice */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground mb-1">Future Feature: Screen Analysis</h4>
              <p className="text-sm text-muted-foreground">
                In a future version, HyperFocus may offer optional screen monitoring to help you stay on task.
                This would be <strong>explicitly opt-in</strong>, never secret, and you'd always have a stop/disable control.
                No passwords or private messages would be collected intentionally.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}