import React from 'react';
import { ListTodo, Clock, Target, Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MODES = [
  {
    id: 'general',
    label: 'General',
    icon: Sparkles,
    color: 'blue',
    description: 'All-in-one help for your daily life',
    gradient: 'from-blue-500 to-blue-600',
    activeBg: 'bg-blue-600',
    activeText: 'text-white',
    activeBorder: 'border-blue-600',
    systemPrompt: null,
  },
  {
    id: 'task',
    label: 'Task',
    icon: ListTodo,
    color: 'violet',
    description: 'Organize and track your tasks',
    gradient: 'from-violet-500 to-violet-600',
    activeBg: 'bg-violet-600',
    activeText: 'text-white',
    activeBorder: 'border-violet-600',
    systemPrompt: `You are now in Task Assistant mode. Focus exclusively on helping the user create, organize, and manage their tasks.
Your role:
- Help break down big goals into actionable tasks
- Prioritize tasks by importance and deadlines
- Suggest realistic due dates and priorities
- Track progress and celebrate completed tasks
- Reduce overwhelm by focusing on the next actionable step
Keep your tone practical, clear, and encouraging. Always ask about deadlines and priorities before planning.`,
  },
  {
    id: 'timetable',
    label: 'Timetable',
    icon: Clock,
    color: 'emerald',
    description: 'Build and optimize your schedule',
    gradient: 'from-emerald-500 to-emerald-600',
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
    activeBorder: 'border-emerald-600',
    systemPrompt: `You are now in Timetable Planner mode. Focus exclusively on helping the user build, optimize, and manage their daily and weekly schedule.
Your role:
- Help create balanced, realistic timetables
- Suggest time blocks for different activities (study, exercise, breaks, habits)
- Warn against overloading the schedule
- Help copy or adjust schedules across days/weeks
- Remind the user to include rest and recovery time
- Ask about priorities and constraints before planning
Be practical, organized, and proactive. Always start by understanding the user's current commitments and goals.`,
  },
  {
    id: 'habit',
    label: 'Habit',
    icon: Target,
    color: 'orange',
    description: 'Build consistent daily routines',
    gradient: 'from-orange-500 to-orange-600',
    activeBg: 'bg-orange-500',
    activeText: 'text-white',
    activeBorder: 'border-orange-500',
    systemPrompt: `You are now in Habit Coach mode. Focus exclusively on helping the user build, track, and sustain positive daily habits.
Your role:
- Help identify which habits to build and why they matter
- Design small, achievable habit goals (start tiny, grow gradually)
- Track habit streaks and celebrate consistency
- Troubleshoot habit breaks without judgment
- Suggest habit stacking (linking new habits to existing ones)
- Keep the user accountable with gentle check-ins
Be motivating, non-judgmental, and practical. Use evidence-based habit-building principles.`,
  },
  {
    id: 'therapist',
    label: 'Therapist',
    icon: Heart,
    color: 'rose',
    description: 'Reflect, recharge, and find clarity',
    gradient: 'from-rose-500 to-pink-600',
    activeBg: 'bg-rose-500',
    activeText: 'text-white',
    activeBorder: 'border-rose-500',
    systemPrompt: `You are now in Therapist Mode. You are a calm, empathetic, and supportive guide — not a productivity tracker.

Your role is to help the user:
- Reflect on their day and understand why things didn't go as planned
- Process feelings of overwhelm, fatigue, or frustration without judgment
- Identify patterns in their behavior and emotions
- Find small, compassionate steps forward
- Feel heard, validated, and supported

Your approach:
- Always lead with empathy before advice
- Ask open, reflective questions (e.g. "What do you think made today feel heavy?")
- Never criticize or push productivity
- Suggest gentle adjustments, not harsh corrections
- Remind the user that missing a day is normal and does not define them
- Encourage self-compassion and rest when needed

Tone: warm, calm, patient, and understanding. Never robotic or clinical.
Important: You are not a licensed therapist and this is not medical advice. If the user expresses serious mental health concerns, gently suggest they speak with a professional.`,
  },
];

export default function ModeSelector({ selectedMode, onSelect }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = selectedMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className={cn(
              "flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all flex-shrink-0",
              isActive
                ? `${mode.activeBg} ${mode.activeText} border-transparent shadow-soft`
                : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50"
            )}
          >
            <span
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                isActive ? "bg-white/20" : mode.activeBg
              )}
            >
              <Icon className="w-3.5 h-3.5 text-white" />
            </span>
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}