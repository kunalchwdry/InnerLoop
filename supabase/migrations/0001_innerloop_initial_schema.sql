-- InnerLoop Initial Schema Migration
-- Generated from entity definitions
-- Safe to run on a fresh Supabase project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE chat_message_role AS ENUM ('user', 'assistant');
CREATE TYPE exercise_type AS ENUM ('yoga', 'gym');
CREATE TYPE exercise_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'custom');
CREATE TYPE notification_type AS ENUM ('info', 'reminder', 'achievement', 'warning');
CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE timetable_slot_type AS ENUM ('study', 'exercise', 'habit', 'work', 'break', 'other');

-- ============================================================
-- TABLES
-- ============================================================

-- Subjects table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- Units table
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- Topics table
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer TEXT,
    difficulty question_difficulty NOT NULL DEFAULT 'medium',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- Exercises table
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type exercise_type NOT NULL DEFAULT 'gym',
    category TEXT,
    level exercise_level NOT NULL DEFAULT 'beginner',
    description TEXT,
    duration_minutes INTEGER,
    sets INTEGER,
    reps INTEGER,
    image_url TEXT
);

-- Exercise Logs table
CREATE TABLE exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    duration_minutes INTEGER,
    sets_completed INTEGER,
    reps_completed INTEGER,
    notes TEXT
);

-- Habits table
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    frequency habit_frequency NOT NULL DEFAULT 'daily',
    target_days TEXT[],
    reminder_time TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Habit Logs table
CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    type notification_type NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT
);

-- Sleep Logs table
CREATE TABLE sleep_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    bed_time TEXT,
    wake_time TEXT,
    sleep_quality INTEGER,
    notes TEXT
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    priority task_priority NOT NULL DEFAULT 'medium',
    due_date DATE
);

-- Timetable Slots table
CREATE TABLE timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type timetable_slot_type NOT NULL DEFAULT 'other',
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    color TEXT,
    reference_id UUID
);

-- Chat Messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role chat_message_role NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Subjects indexes
CREATE INDEX idx_subjects_created_by_id ON subjects(created_by_id);
CREATE INDEX idx_subjects_order ON subjects(created_by_id, "order");

-- Units indexes
CREATE INDEX idx_units_created_by_id ON units(created_by_id);
CREATE INDEX idx_units_subject_id ON units(subject_id);
CREATE INDEX idx_units_order ON units(subject_id, "order");

-- Topics indexes
CREATE INDEX idx_topics_created_by_id ON topics(created_by_id);
CREATE INDEX idx_topics_unit_id ON topics(unit_id);
CREATE INDEX idx_topics_order ON topics(unit_id, "order");
CREATE INDEX idx_topics_completed ON topics(created_by_id, completed);

-- Questions indexes
CREATE INDEX idx_questions_created_by_id ON questions(created_by_id);
CREATE INDEX idx_questions_topic_id ON questions(topic_id);
CREATE INDEX idx_questions_order ON questions(topic_id, "order");
CREATE INDEX idx_questions_completed ON questions(created_by_id, completed);

-- Exercises indexes
CREATE INDEX idx_exercises_created_by_id ON exercises(created_by_id);
CREATE INDEX idx_exercises_type ON exercises(created_by_id, type);
CREATE INDEX idx_exercises_level ON exercises(created_by_id, level);

-- Exercise Logs indexes
CREATE INDEX idx_exercise_logs_created_by_id ON exercise_logs(created_by_id);
CREATE INDEX idx_exercise_logs_exercise_id ON exercise_logs(exercise_id);
CREATE INDEX idx_exercise_logs_date ON exercise_logs(created_by_id, date);
CREATE INDEX idx_exercise_logs_completed ON exercise_logs(created_by_id, completed);

-- Habits indexes
CREATE INDEX idx_habits_created_by_id ON habits(created_by_id);
CREATE INDEX idx_habits_frequency ON habits(created_by_id, frequency);
CREATE INDEX idx_habits_is_active ON habits(created_by_id, is_active);

-- Habit Logs indexes
CREATE INDEX idx_habit_logs_created_by_id ON habit_logs(created_by_id);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date ON habit_logs(created_by_id, date);
CREATE INDEX idx_habit_logs_completed ON habit_logs(created_by_id, completed);

-- Notifications indexes
CREATE INDEX idx_notifications_created_by_id ON notifications(created_by_id);
CREATE INDEX idx_notifications_read ON notifications(created_by_id, read);
CREATE INDEX idx_notifications_type ON notifications(created_by_id, type);
CREATE INDEX idx_notifications_created_at ON notifications(created_by_id, created_at DESC);

-- Sleep Logs indexes
CREATE INDEX idx_sleep_logs_created_by_id ON sleep_logs(created_by_id);
CREATE INDEX idx_sleep_logs_date ON sleep_logs(created_by_id, date);

-- Tasks indexes
CREATE INDEX idx_tasks_created_by_id ON tasks(created_by_id);
CREATE INDEX idx_tasks_completed ON tasks(created_by_id, completed);
CREATE INDEX idx_tasks_priority ON tasks(created_by_id, priority);
CREATE INDEX idx_tasks_due_date ON tasks(created_by_id, due_date);

-- Timetable Slots indexes
CREATE INDEX idx_timetable_slots_created_by_id ON timetable_slots(created_by_id);
CREATE INDEX idx_timetable_slots_date ON timetable_slots(created_by_id, date);
CREATE INDEX idx_timetable_slots_type ON timetable_slots(created_by_id, type);
CREATE INDEX idx_timetable_slots_completed ON timetable_slots(created_by_id, completed);
CREATE INDEX idx_timetable_slots_reference_id ON timetable_slots(reference_id);

-- Chat Messages indexes
CREATE INDEX idx_chat_messages_created_by_id ON chat_messages(created_by_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(created_by_id, timestamp DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Subjects policies
CREATE POLICY "Subjects: Users can create their own" ON subjects
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Subjects: Users can read their own" ON subjects
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Subjects: Users can update their own" ON subjects
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Subjects: Users can delete their own" ON subjects
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Units policies
CREATE POLICY "Units: Users can create their own" ON units
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Units: Users can read their own" ON units
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Units: Users can update their own" ON units
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Units: Users can delete their own" ON units
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Topics policies
CREATE POLICY "Topics: Users can create their own" ON topics
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Topics: Users can read their own" ON topics
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Topics: Users can update their own" ON topics
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Topics: Users can delete their own" ON topics
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Questions policies
CREATE POLICY "Questions: Users can create their own" ON questions
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Questions: Users can read their own" ON questions
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Questions: Users can update their own" ON questions
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Questions: Users can delete their own" ON questions
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Exercises policies
CREATE POLICY "Exercises: Users can create their own" ON exercises
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Exercises: Users can read their own" ON exercises
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Exercises: Users can update their own" ON exercises
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Exercises: Users can delete their own" ON exercises
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Exercise Logs policies
CREATE POLICY "Exercise Logs: Users can create their own" ON exercise_logs
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Exercise Logs: Users can read their own" ON exercise_logs
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Exercise Logs: Users can update their own" ON exercise_logs
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Exercise Logs: Users can delete their own" ON exercise_logs
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Habits policies
CREATE POLICY "Habits: Users can create their own" ON habits
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Habits: Users can read their own" ON habits
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Habits: Users can update their own" ON habits
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Habits: Users can delete their own" ON habits
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Habit Logs policies
CREATE POLICY "Habit Logs: Users can create their own" ON habit_logs
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Habit Logs: Users can read their own" ON habit_logs
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Habit Logs: Users can update their own" ON habit_logs
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Habit Logs: Users can delete their own" ON habit_logs
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Notifications policies
CREATE POLICY "Notifications: Users can create their own" ON notifications
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Notifications: Users can read their own" ON notifications
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Notifications: Users can update their own" ON notifications
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Notifications: Users can delete their own" ON notifications
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Sleep Logs policies
CREATE POLICY "Sleep Logs: Users can create their own" ON sleep_logs
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Sleep Logs: Users can read their own" ON sleep_logs
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Sleep Logs: Users can update their own" ON sleep_logs
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Sleep Logs: Users can delete their own" ON sleep_logs
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Tasks policies
CREATE POLICY "Tasks: Users can create their own" ON tasks
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Tasks: Users can read their own" ON tasks
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Tasks: Users can update their own" ON tasks
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Tasks: Users can delete their own" ON tasks
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Timetable Slots policies
CREATE POLICY "Timetable Slots: Users can create their own" ON timetable_slots
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Timetable Slots: Users can read their own" ON timetable_slots
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Timetable Slots: Users can update their own" ON timetable_slots
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Timetable Slots: Users can delete their own" ON timetable_slots
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Chat Messages policies
CREATE POLICY "Chat Messages: Users can create their own" ON chat_messages
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Chat Messages: Users can read their own" ON chat_messages
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Chat Messages: Users can update their own" ON chat_messages
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Chat Messages: Users can delete their own" ON chat_messages
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at
    BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_logs_updated_at
    BEFORE UPDATE ON exercise_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_logs_updated_at
    BEFORE UPDATE ON habit_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleep_logs_updated_at
    BEFORE UPDATE ON sleep_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetable_slots_updated_at
    BEFORE UPDATE ON timetable_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- UNIQUE CONSTRAINTS
-- ============================================================

-- Ensure one habit log per habit per day
ALTER TABLE habit_logs ADD CONSTRAINT unique_habit_log_per_day
    UNIQUE (habit_id, date, created_by_id);

-- Ensure one exercise log per exercise per day
ALTER TABLE exercise_logs ADD CONSTRAINT unique_exercise_log_per_day
    UNIQUE (exercise_id, date, created_by_id);

-- Ensure one sleep log per day
ALTER TABLE sleep_logs ADD CONSTRAINT unique_sleep_log_per_day
    UNIQUE (date, created_by_id);

-- ============================================================
-- GRANTS
-- ============================================================

-- Grant usage on enums to authenticated role
GRANT USAGE ON TYPE chat_message_role TO authenticated;
GRANT USAGE ON TYPE exercise_type TO authenticated;
GRANT USAGE ON TYPE exercise_level TO authenticated;
GRANT USAGE ON TYPE habit_frequency TO authenticated;
GRANT USAGE ON TYPE notification_type TO authenticated;
GRANT USAGE ON TYPE question_difficulty TO authenticated;
GRANT USAGE ON TYPE task_priority TO authenticated;
GRANT USAGE ON TYPE timetable_slot_type TO authenticated;

-- Grant all on tables to authenticated role
GRANT ALL ON subjects TO authenticated;
GRANT ALL ON units TO authenticated;
GRANT ALL ON topics TO authenticated;
GRANT ALL ON questions TO authenticated;
GRANT ALL ON exercises TO authenticated;
GRANT ALL ON exercise_logs TO authenticated;
GRANT ALL ON habits TO authenticated;
GRANT ALL ON habit_logs TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON sleep_logs TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON timetable_slots TO authenticated;
GRANT ALL ON chat_messages TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE subjects IS 'Academic subjects for study tracking';
COMMENT ON TABLE units IS 'Units within a subject';
COMMENT ON TABLE topics IS 'Topics within a unit';
COMMENT ON TABLE questions IS 'Practice questions for topics';
COMMENT ON TABLE exercises IS 'Exercise definitions (yoga/gym)';
COMMENT ON TABLE exercise_logs IS 'Daily exercise completion logs';
COMMENT ON TABLE habits IS 'Habit definitions with frequency and reminders';
COMMENT ON TABLE habit_logs IS 'Daily habit completion logs';
COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON TABLE sleep_logs IS 'Daily sleep tracking logs';
COMMENT ON TABLE tasks IS 'General task management';
COMMENT ON TABLE timetable_slots IS 'Daily schedule slots';
COMMENT ON TABLE chat_messages IS 'AI chat conversation history';

COMMENT ON COLUMN habits.target_days IS 'Array of day names for custom frequency (e.g., ["monday", "wednesday"])';
COMMENT ON COLUMN timetable_slots.reference_id IS 'Optional reference to related entity (subject, exercise, habit, etc.)';
COMMENT ON COLUMN exercises.category IS 'Yoga: flexibility, breathing, relaxation. Gym: chest, back, legs, arms, shoulders, core';