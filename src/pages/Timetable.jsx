
import React, { useState } from 'react';

import { db } from '@/lib/supabaseApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, parseISO } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Copy, Trash2, Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import PageHeader from '../components/common/PageHeader';

const SLOT_TYPES = [
  { value: 'study', label: 'Study', color: 'bg-blue-500' },
  { value: 'exercise', label: 'Exercise', color: 'bg-emerald-500' },
  { value: 'habit', label: 'Habit', color: 'bg-amber-500' },
  { value: 'work', label: 'Work', color: 'bg-purple-500' },
  { value: 'break', label: 'Break', color: 'bg-stone-400' },
  { value: 'other', label: 'Other', color: 'bg-stone-500' },
];

export default function Timetable() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'other',
    start_time: '09:00',
    end_time: '10:00',
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart),
  });

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['timetableSlots'],
    queryFn: () => db.entities.TimetableSlot.list('-date', 500),
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

  const bulkCreateMutation = useMutation({
    mutationFn: (items) => db.entities.TimetableSlot.bulkCreate(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetableSlots'] });
      toast({ title: 'Activities copied successfully' });
    },
    onError: (error) => {
      console.error('Bulk create activities failed:', error);
      toast({ title: 'Unable to copy activities', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ title: '', type: 'other', start_time: '09:00', end_time: '10:00' });
    setEditingSlot(null);
    setSelectedDate(null);
  };

  const handleAddSlot = (date) => {
    setSelectedDate(date);
    resetForm();
    setShowDialog(true);
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setSelectedDate(parseISO(slot.date));
    setFormData({
      title: slot.title,
      type: slot.type,
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !selectedDate) return;
    const data = {
      ...formData,
      date: format(selectedDate, 'yyyy-MM-dd'),
    };
    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleComplete = (slot) => {
    updateMutation.mutate({ id: slot.id, data: { completed: !slot.completed } });
  };

  const copyToTomorrow = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySlots = slots.filter(s => s.date === dateStr);
    const tomorrowStr = format(addDays(date, 1), 'yyyy-MM-dd');
    const newSlots = daySlots.map(({ title, type, start_time, end_time, color }) => ({
      title, type, start_time, end_time, color, date: tomorrowStr, completed: false
    }));
    if (newSlots.length > 0) {
      bulkCreateMutation.mutate(newSlots);
    }
  };

  const copyWeekToNext = () => {
    const weekSlots = slots.filter(s => {
      const slotDate = parseISO(s.date);
      return slotDate >= currentWeekStart && slotDate <= endOfWeek(currentWeekStart);
    });
    const newSlots = weekSlots.map(({ title, type, start_time, end_time, color, date }) => ({
      title, type, start_time, end_time, color,
      date: format(addWeeks(parseISO(date), 1), 'yyyy-MM-dd'),
      completed: false
    }));
    if (newSlots.length > 0) {
      bulkCreateMutation.mutate(newSlots);
    }
  };

  const applyToWeek = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySlots = slots.filter(s => s.date === dateStr);
    const newSlots = [];
    weekDays.forEach(d => {
      if (!isSameDay(d, date)) {
        daySlots.forEach(({ title, type, start_time, end_time, color }) => {
          newSlots.push({
            title, type, start_time, end_time, color,
            date: format(d, 'yyyy-MM-dd'),
            completed: false
          });
        });
      }
    });
    if (newSlots.length > 0) {
      bulkCreateMutation.mutate(newSlots);
    }
  };

  const getDaySlots = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return slots.filter(s => s.date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Timetable" 
        subtitle="Plan and manage your schedule"
        action={
          <Button onClick={copyWeekToNext} variant="outline" className="text-stone-600">
            <Copy className="w-4 h-4 mr-2" /> Copy Week to Next
          </Button>
        }
      />

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-stone-200/60 shadow-sm p-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="font-semibold text-stone-900">
          {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart), 'MMM d, yyyy')}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const isToday = isSameDay(day, new Date());
          const daySlots = getDaySlots(day);

          return (
            <div 
              key={day.toISOString()}
              className={cn(
                "bg-white rounded-2xl border shadow-sm overflow-hidden",
                isToday ? "border-amber-300 ring-2 ring-amber-100" : "border-stone-200/60"
              )}
            >
              {/* Day Header */}
              <div className={cn(
                "p-3 border-b flex items-center justify-between",
                isToday ? "bg-amber-50 border-amber-200" : "bg-stone-50 border-stone-100"
              )}>
                <div>
                  <p className="text-xs text-stone-500 font-medium">{format(day, 'EEE')}</p>
                  <p className={cn(
                    "text-lg font-bold",
                    isToday ? "text-amber-700" : "text-stone-900"
                  )}>{format(day, 'd')}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Copy className="w-4 h-4 text-stone-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => copyToTomorrow(day)}>
                      Copy to Tomorrow
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => applyToWeek(day)}>
                      Apply to Whole Week
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Slots */}
              <div className="p-2 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                {daySlots.map((slot) => {
                  const typeConfig = SLOT_TYPES.find(t => t.value === slot.type) || SLOT_TYPES[5];
                  return (
                    <div
                      key={slot.id}
                      onClick={() => handleEditSlot(slot)}
                      className={cn(
                        "p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm group",
                        slot.completed ? "bg-stone-50 border-stone-200" : "bg-white border-stone-200"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn("w-1 h-full min-h-[32px] rounded-full", typeConfig.color)} />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            slot.completed ? "text-stone-400 line-through" : "text-stone-900"
                          )}>{slot.title}</p>
                          <p className="text-xs text-stone-500">{slot.start_time} - {slot.end_time}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleComplete(slot); }}
                          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {slot.completed ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-stone-300" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                <button
                  onClick={() => handleAddSlot(day)}
                  className="w-full p-2 rounded-lg border-2 border-dashed border-stone-200 text-stone-400 hover:border-amber-300 hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-xs">Add</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? 'Edit Activity' : 'Add Activity'}
              {selectedDate && ` - ${format(selectedDate, 'MMM d')}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">Title</label>
              <Input 
                placeholder="Activity name"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">Type</label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <label className="text-sm font-medium text-stone-700 mb-2 block">Start Time</label>
                <Input 
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 mb-2 block">End Time</label>
                <Input 
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editingSlot && (
              <Button 
                variant="outline" 
                onClick={() => { deleteMutation.mutate(editingSlot.id); setShowDialog(false); }}
                className="text-red-600 hover:text-red-700 mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-700">
                {editingSlot ? 'Update' : 'Add'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}