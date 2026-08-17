import React, { useState } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dumbbell, Plus, Check, Flame, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatsCard from '@/components/dashboard/StatsCard';
import { PageTransition, staggerContainer, fadeUp } from '@/components/common/motion';

const YOGA_CATEGORIES = ['flexibility', 'breathing', 'relaxation', 'strength', 'balance'];
const GYM_CATEGORIES = ['chest', 'back', 'legs', 'arms', 'shoulders', 'core', 'cardio'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

export default function Exercise() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('gym');
  const [showDialog, setShowDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    type: 'gym',
    category: 'chest',
    level: 'beginner',
    description: '',
    duration_minutes: 30,
    sets: 3,
    reps: 12,
  });
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { toast } = useToast();

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => db.entities.Exercise.list(),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const { data: exerciseLogs = [] } = useQuery({
    queryKey: ['exerciseLogs', today],
    queryFn: () => db.entities.ExerciseLog.filter({ date: today }),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Exercise.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setShowDialog(false);
      resetForm();
      toast({ title: 'Exercise created successfully' });
    },
    onError: (error) => {
      console.error('Create exercise failed:', error);
      toast({ title: 'Unable to create exercise', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Exercise.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setShowDialog(false);
      resetForm();
      toast({ title: 'Exercise updated successfully' });
    },
    onError: (error) => {
      console.error('Update exercise failed:', error);
      toast({ title: 'Unable to update exercise', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Exercise.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast({ title: 'Exercise deleted successfully' });
    },
    onError: (error) => {
      console.error('Delete exercise failed:', error);
      toast({ title: 'Unable to delete exercise', description: error.message, variant: 'destructive' });
    },
  });

  const toggleLogMutation = useMutation({
    mutationFn: async ({ exerciseId, completed }) => {
      const existingLog = exerciseLogs.find(log => log.exercise_id === exerciseId);
      if (existingLog) {
        if (!completed) {
          return db.entities.ExerciseLog.delete(existingLog.id);
        }
        return db.entities.ExerciseLog.update(existingLog.id, { completed });
      } else if (completed) {
        return db.entities.ExerciseLog.create({ exercise_id: exerciseId, date: today, completed: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseLogs'] });
    },
    onError: (error) => {
      console.error('Toggle exercise log failed:', error);
      toast({ title: 'Unable to update exercise log', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: activeTab,
      category: activeTab === 'gym' ? 'chest' : 'flexibility',
      level: 'beginner',
      description: '',
      duration_minutes: 30,
      sets: 3,
      reps: 12,
    });
    setEditingExercise(null);
  };

  const handleEdit = (exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      type: exercise.type,
      category: exercise.category || '',
      level: exercise.level || 'beginner',
      description: exercise.description || '',
      duration_minutes: exercise.duration_minutes || 30,
      sets: exercise.sets || 3,
      reps: exercise.reps || 12,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (editingExercise) {
      updateMutation.mutate({ id: editingExercise.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isCompleted = (exerciseId) => {
    return exerciseLogs.some(log => log.exercise_id === exerciseId && log.completed);
  };

  const filteredExercises = exercises.filter(e => {
    if (e.type !== activeTab) return false;
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    return true;
  });

  const categories = activeTab === 'gym' ? GYM_CATEGORIES : YOGA_CATEGORIES;
  const completedToday = exerciseLogs.filter(log => log.completed).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Exercise"
          subtitle="Track your workouts and yoga sessions"
          action={
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Exercise
            </Button>
          }
        />

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-3 gap-5">
          <motion.div variants={fadeUp}><StatsCard title="Gym Exercises" value={exercises.filter(e => e.type === 'gym').length} icon={Dumbbell} color="emerald" /></motion.div>
          <motion.div variants={fadeUp}><StatsCard title="Yoga Sessions" value={exercises.filter(e => e.type === 'yoga').length} icon={Sparkles} color="purple" /></motion.div>
          <motion.div variants={fadeUp}><StatsCard title="Done Today" value={completedToday} icon={Flame} color="amber" /></motion.div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted rounded-2xl p-1 h-auto">
            <TabsTrigger value="gym" className="rounded-xl px-6 data-[state=active]:bg-card data-[state=active]:shadow-soft">
              <Dumbbell className="w-4 h-4 mr-2" /> Gym
            </TabsTrigger>
            <TabsTrigger value="yoga" className="rounded-xl px-6 data-[state=active]:bg-card data-[state=active]:shadow-soft">
              <Sparkles className="w-4 h-4 mr-2" /> Yoga
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedCategory === 'all'
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all capitalize",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <TabsContent value="gym" className="mt-0">
            {filteredExercises.length === 0 ? (
              <div className="bg-card rounded-3xl border border-border/60 shadow-soft">
                <EmptyState
                  icon={Dumbbell}
                  title="No exercises yet"
                  description="Add your gym exercises to track your workouts"
                  action={
                    <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                      <Plus className="w-4 h-4 mr-2" /> Add Exercise
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    completed={isCompleted(exercise.id)}
                    onToggle={(completed) => toggleLogMutation.mutate({ exerciseId: exercise.id, completed })}
                    onEdit={() => handleEdit(exercise)}
                    onDelete={() => deleteMutation.mutate(exercise.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="yoga" className="mt-0">
            {filteredExercises.length === 0 ? (
              <div className="bg-card rounded-3xl border border-border/60 shadow-soft">
                <EmptyState
                  icon={Sparkles}
                  title="No yoga sessions yet"
                  description="Add yoga sessions for flexibility and relaxation"
                  action={
                    <Button onClick={() => { resetForm(); setFormData({ ...formData, type: 'yoga', category: 'flexibility' }); setShowDialog(true); }}>
                      <Plus className="w-4 h-4 mr-2" /> Add Yoga
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    completed={isCompleted(exercise.id)}
                    onToggle={(completed) => toggleLogMutation.mutate({ exerciseId: exercise.id, completed })}
                    onEdit={() => handleEdit(exercise)}
                    onDelete={() => deleteMutation.mutate(exercise.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingExercise ? 'Edit Exercise' : 'Add Exercise'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Name</label>
                <Input placeholder="Exercise name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v, category: v === 'gym' ? 'chest' : 'flexibility' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gym">Gym</SelectItem>
                      <SelectItem value="yoga">Yoga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(formData.type === 'gym' ? GYM_CATEGORIES : YOGA_CATEGORIES).map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Level</label>
                <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((level) => (
                      <SelectItem key={level} value={level} className="capitalize">{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.type === 'gym' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Sets</label>
                    <Input type="number" value={formData.sets} onChange={(e) => setFormData({ ...formData, sets: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Reps</label>
                    <Input type="number" value={formData.reps} onChange={(e) => setFormData({ ...formData, reps: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Duration (min)</label>
                    <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              )}
              {formData.type === 'yoga' && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Duration (minutes)</label>
                  <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })} />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                <Textarea placeholder="Exercise description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingExercise ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

function ExerciseCard({ exercise, completed, onToggle, onEdit, onDelete }) {
  const levelColors = {
    beginner: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    intermediate: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    advanced: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "bg-card rounded-3xl border shadow-soft p-5 transition-shadow duration-300 hover:shadow-premium",
        completed ? "border-emerald-300/60 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5" : "border-border/60"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            exercise.type === 'gym' ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25" : "bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25"
          )}>
            {exercise.type === 'gym' ? <Dumbbell className="w-6 h-6 text-white" /> : <Sparkles className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{exercise.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{exercise.category}</p>
          </div>
        </div>
        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full capitalize", levelColors[exercise.level])}>
          {exercise.level}
        </span>
      </div>

      {exercise.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{exercise.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        {exercise.type === 'gym' && exercise.sets && (
          <span>{exercise.sets} sets × {exercise.reps} reps</span>
        )}
        {exercise.duration_minutes && (
          <span>{exercise.duration_minutes} min</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/60">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-rose-500" />
          </Button>
        </div>
        <Button
          variant={completed ? "default" : "outline"}
          size="sm"
          onClick={() => onToggle(!completed)}
        >
          {completed ? (
            <><Check className="w-4 h-4 mr-1" /> Done</>
          ) : (
            "Mark Done"
          )}
        </Button>
      </div>
    </motion.div>
  );
}