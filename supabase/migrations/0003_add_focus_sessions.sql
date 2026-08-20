-- Add Focus Sessions table for HyperFocus feature
-- Generated for InnerLoop prototype

-- Create focus_sessions table
CREATE TABLE focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL, -- duration in minutes
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for focus_sessions
CREATE INDEX idx_focus_sessions_created_by_id ON focus_sessions(created_by_id);
CREATE INDEX idx_focus_sessions_task_id ON focus_sessions(task_id);
CREATE INDEX idx_focus_sessions_started_at ON focus_sessions(created_by_id, started_at DESC);
CREATE INDEX idx_focus_sessions_completed ON focus_sessions(created_by_id, completed);

-- RLS for focus_sessions
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Focus Sessions: Users can create their own" ON focus_sessions
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Focus Sessions: Users can read their own" ON focus_sessions
    FOR SELECT USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Focus Sessions: Users can update their own" ON focus_sessions
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());
CREATE POLICY "Focus Sessions: Users can delete their own" ON focus_sessions
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_focus_sessions_updated_at
    BEFORE UPDATE ON focus_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON focus_sessions TO authenticated;

-- Comment
COMMENT ON TABLE focus_sessions IS 'HyperFocus deep work session tracking';
COMMENT ON COLUMN focus_sessions.duration IS 'Session duration in minutes';
COMMENT ON COLUMN focus_sessions.started_at IS 'When the session started';
COMMENT ON COLUMN focus_sessions.ended_at IS 'When the session ended (null if active)';
COMMENT ON COLUMN focus_sessions.completed IS 'Whether the session was completed (not interrupted)';