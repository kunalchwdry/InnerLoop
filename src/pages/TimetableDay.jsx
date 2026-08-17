import React, { useState } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, startOfWeek } from 'date-fns';
import { Clock, Plus, ChevronLeft, ChevronRight, Trash2, Check, Circle, Edit2, Copy, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import PageHeader from '../components/common/PageHeader';
import { PageTransition, fadeUp, staggerContainer } from '../components/common/motion';

const SLOT_TYPES = [
  { value: 'study', label: 'Study', color: 'bg-blue-500' },
  { value: 'exercise', label: 'Exercise', color: 'bg-emerald-500' },
  { value: 'habit', label: 'Habit', color: 'bg-amber-500' },
  { value: 'work', label: 'Work', color: 'bg-indigo-500' },
  { value: 'break', label: 'Break', color: 'bg-slate-400' },
  { value: 'other', label: 'Other', color: 'bg-slate-500' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableDay() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'other',
    start_time: '09:00',
    end_time: '10:00',
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayName = DAYS[currentDate.getDay()];

  const { data: slots = [] } = useQuery({
    queryKey: ['timetableSlots', dateStr],
    queryFn: () => db.entities.TimetableSlot.filter({ date: dateStr }),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.TimetableSlot.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetableSlots'] });
      setShowDialog(false);
      resetForm();
      toast({ title: 'Activity added successfully' });
    },
    onError: (error) => {
      console.error('Create activity failed:', error);
      toast({ title: 'Unable to add activity', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.TimetableSlot.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetableSlots'] });
      setShowDialog(false);
      resetForm();
      toast({ title: 'Activity updated successfully' });
    },
    onError: (error) => {
      console.error('Update activity failed:', error);
      toast({ title: 'Unable to update activity', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.TimetableSlot.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetableSlots'] });
      toast({ title: 'Activity deleted successfully' });
    },
    onError: (error) => {
      console.error('Delete activity failed:', error);
      toast({ title: 'Unable to delete activity', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ title: '', type: 'other', start_time: '09:00', end_time: '10:00' });
    setEditingSlot(null);
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setFormData({
      title: slot.title,
      type: slot.type,
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    const data = { ...formData, date: dateStr };
    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleComplete = (slot) => {
    updateMutation.mutate({ id: slot.id, data: { completed: !slot.completed } });
  };

  const sortedSlots = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const goToPrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
  const [isCopying, setIsCopying] = useState(false);

  const copyFromLastWeek = async () => {
    setIsCopying(true);
    const lastWeekDate = format(subDays(currentDate, 7), 'yyyy-MM-dd');
    const lastWeekSlots = await db.entities.TimetableSlot.filter({ date: lastWeekDate });
    if (lastWeekSlots.length === 0) {
      alert('No activities found on this day last week.');
      setIsCopying(false);
      return;
    }
    await Promise.all(lastWeekSlots.map(slot =>
      db.entities.TimetableSlot.create({
        title: slot.title,
        type: slot.type,
        start_time: slot.start_time,
        end_time: slot.end_time,
        date: dateStr,
        color: slot.color,
      })
    ));
    queryClient.invalidateQueries({ queryKey: ['timetableSlots'] });
    setIsCopying(false);
  };

  const copyToWholeWeek = async () => {
    if (slots.length === 0) {
      alert('No activities on this day to copy.');
      return;
    }
    setIsCopying(true);
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd')).filter(d => d !== dateStr);
    await Promise.all(weekDays.flatMap(targetDate =>
      slots.map(slot =>
        db.entities.TimetableSlot.create({
          title: slot.title,
          type: slot.type,
          start_time: slot.start_time,
          end_time: slot.end_time,
          date: targetDate,
          color: slot.color,
        })
      )
    ));
    queryClient.invalidateQueries({ queryKey: ['timetableSlots'] });
    setIsCopying(false);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader title="Daily Timetable" subtitle="Manage your schedule one day at a time" />

        <div className="bg-card rounded-3xl border border-border/60 shadow-soft p-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPrevDay} className="rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">{dayName}</h2>
              <p className="text-muted-foreground">{format(currentDate, 'MMMM d, yyyy')}</p>
              {isToday && (
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  Today
                </span>
              )}
            </div>

            <Button variant="ghost" size="icon" onClick={goToNextDay} className="rounded-xl">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {!isToday && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm" onClick={goToToday}>Go to Today</Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isCopying}>
                {isCopying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyFromLastWeek}>Copy from last week (same day)</DropdownMenuItem>
              <DropdownMenuItem onClick={copyToWholeWeek}>Copy to whole week</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Activity
          </Button>
        </div>

        <div className="bg-card rounded-3xl border border-border/60 shadow-soft overflow-hidden">
          {sortedSlots.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
                <Clock className="w-7 h-7 opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground">No activities scheduled</p>
              <p className="text-sm mt-1">Add your first activity for {dayName}</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="divide-y divide-border/60">
              {sortedSlots.map((slot) => {
                const typeConfig = SLOT_TYPES.find(t => t.value === slot.type) || SLOT_TYPES[5];
                return (
                  <motion.div key={slot.id} variants={fadeUp} className="p-4 hover:bg-muted/40 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className={cn("w-1.5 h-16 rounded-full flex-shrink-0", typeConfig.color)} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className={cn(
                              "font-semibold text-lg",
                              slot.completed ? "text-muted-foreground line-through" : "text-foreground"
                            )}>
                              {slot.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {slot.start_time} - {slot.end_time}
                              </p>
                              <span className="text-xs px-2.5 py-0.5 bg-muted text-muted-foreground rounded-full capitalize">
                                {typeConfig.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleComplete(slot)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                              {slot.completed ? (
                                <Check className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground/40" />
                              )}
                            </button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditSlot(slot)} className="opacity-0 group-hover:opacity-100">
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(slot.id)} className="opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-rose-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSlot ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
                <Input placeholder="Activity name" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLOT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", type.color)} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Start Time</label>
                  <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">End Time</label>
                  <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingSlot ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}