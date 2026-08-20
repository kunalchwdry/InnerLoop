-- ============================================================
-- PHASE 5: COMMUNITY CHALLENGES
-- ============================================================

-- Challenge Templates (predefined challenge types)
CREATE TABLE challenge_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Basic info
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    
    -- Challenge config
    duration_days INTEGER NOT NULL, -- e.g., 7, 14, 21, 30
    category TEXT NOT NULL, -- 'focus', 'dsa', 'habit', 'productivity', 'learning'
    difficulty TEXT NOT NULL DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    
    -- Requirements
    daily_target_type TEXT NOT NULL, -- 'focus_minutes', 'tasks_completed', 'habits_completed', 'dsa_problems', 'study_hours'
    daily_target_value INTEGER NOT NULL, -- e.g., 30 (minutes), 3 (tasks), etc.
    
    -- Streak rules
    streak_type TEXT NOT NULL DEFAULT 'consecutive', -- 'consecutive', 'total_days'
    allow_skip_days INTEGER NOT NULL DEFAULT 0,
    
    -- Scoring (for leaderboard)
    scoring_method TEXT NOT NULL DEFAULT 'consistency', -- 'consistency', 'total_hours', 'total_tasks', 'streak_length'
    base_points INTEGER NOT NULL DEFAULT 10,
    streak_bonus_points INTEGER NOT NULL DEFAULT 5,
    completion_bonus_points INTEGER NOT NULL DEFAULT 100,
    
    -- Display
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date DATE, -- If null, can start anytime
    end_date DATE, -- If null, no end date
    
    -- Metadata
    tags TEXT[],
    estimated_effort_minutes INTEGER, -- Daily estimated effort
    prerequisites TEXT[] -- e.g., ['Basic JavaScript', 'HTML/CSS']
);

-- Challenges (instances of templates that users join)
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Template reference
    template_id UUID REFERENCES challenge_templates(id) ON DELETE SET NULL,
    
    -- Custom overrides (for custom challenges)
    name TEXT,
    description TEXT,
    icon TEXT,
    color TEXT,
    duration_days INTEGER,
    category TEXT,
    daily_target_type TEXT,
    daily_target_value INTEGER,
    
    -- Creator (for custom challenges)
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Community association (optional)
    community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
    
    -- Visibility
    visibility TEXT NOT NULL DEFAULT 'public', -- 'public', 'community', 'private'
    require_approval BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'active', 'completed', 'archived'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Stats (cached)
    participants_count INTEGER NOT NULL DEFAULT 0,
    completions_count INTEGER NOT NULL DEFAULT 0,
    
    -- Settings
    show_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
    allow_late_join BOOLEAN NOT NULL DEFAULT TRUE,
    max_participants INTEGER, -- null = unlimited
    
    UNIQUE(template_id, start_date) -- One instance per template per start date
);

-- Challenge Participants (users joining challenges)
CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'dropped', 'paused'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Progress tracking
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_days_active INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    
    -- Daily progress (JSON array of daily records)
    daily_progress JSONB DEFAULT '[]', -- [{date, target_met, value, points, streak_day}]
    
    -- Completion
    completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Settings
    notify_daily_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    notify_streak_risk BOOLEAN NOT NULL DEFAULT TRUE,
    notify_milestones BOOLEAN NOT NULL DEFAULT TRUE,
    share_progress_publicly BOOLEAN NOT NULL DEFAULT FALSE,
    
    UNIQUE(challenge_id, user_id)
);

-- Challenge Daily Logs (detailed daily activity)
CREATE TABLE challenge_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Target tracking
    target_type TEXT NOT NULL, -- 'focus_minutes', 'tasks_completed', etc.
    target_value INTEGER NOT NULL, -- What was required
    actual_value INTEGER NOT NULL DEFAULT 0, -- What was achieved
    target_met BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Points earned
    base_points INTEGER NOT NULL DEFAULT 0,
    streak_bonus INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    
    -- Streak info
    streak_day INTEGER NOT NULL DEFAULT 0,
    is_streak_continuing BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Source data
    source_data JSONB DEFAULT '{}', -- {focus_sessions: [...], tasks: [...], habits: [...]}
    
    UNIQUE(participant_id, date)
);

-- Challenge Leaderboard (cached rankings)
CREATE TABLE challenge_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
    
    rank INTEGER NOT NULL,
    total_points INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_days_active INTEGER NOT NULL DEFAULT 0,
    
    -- Rank change
    previous_rank INTEGER,
    rank_change INTEGER DEFAULT 0, -- positive = moved up
    
    UNIQUE(challenge_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_challenge_templates_category ON challenge_templates(category);
CREATE INDEX idx_challenge_templates_active ON challenge_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_challenge_templates_featured ON challenge_templates(is_featured) WHERE is_featured = TRUE;

CREATE INDEX idx_challenges_template_id ON challenges(template_id);
CREATE INDEX idx_challenges_community_id ON challenges(community_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date);
CREATE INDEX idx_challenges_visibility ON challenges(visibility);
CREATE INDEX idx_challenges_created_by ON challenges(created_by_id);

CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_status ON challenge_participants(status);
CREATE INDEX idx_challenge_participants_points ON challenge_participants(challenge_id, total_points DESC);

CREATE INDEX idx_challenge_daily_logs_challenge ON challenge_daily_logs(challenge_id);
CREATE INDEX idx_challenge_daily_logs_participant ON challenge_daily_logs(participant_id);
CREATE INDEX idx_challenge_daily_logs_date ON challenge_daily_logs(participant_id, date DESC);
CREATE INDEX idx_challenge_daily_logs_user_date ON challenge_daily_logs(user_id, date DESC);

CREATE INDEX idx_challenge_leaderboard_challenge ON challenge_leaderboard(challenge_id, rank);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_leaderboard ENABLE ROW LEVEL SECURITY;

-- Challenge Templates: Read active templates
CREATE POLICY "Challenge Templates: Read active" ON challenge_templates
    FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Challenge Templates: Admin manage" ON challenge_templates
    FOR ALL USING (is_admin());

-- Challenges: Read access based on visibility
CREATE POLICY "Challenges: Read public" ON challenges
    FOR SELECT USING (
        visibility = 'public'
        OR created_by_id = auth.uid()
        OR (visibility = 'community' AND community_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = challenges.community_id AND user_id = auth.uid()
        ))
        OR EXISTS (
            SELECT 1 FROM challenge_participants 
            WHERE challenge_id = challenges.id AND user_id = auth.uid()
        )
        OR is_admin()
    );

CREATE POLICY "Challenges: Users can create" ON challenges
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());

CREATE POLICY "Challenges: Creator can update" ON challenges
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());

CREATE POLICY "Challenges: Creator can delete" ON challenges
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Challenge Participants
CREATE POLICY "Challenge Participants: Users can join" ON challenge_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM challenges c
            WHERE c.id = challenge_id
            AND c.status IN ('upcoming', 'active')
            AND (c.allow_late_join = TRUE OR c.start_date >= CURRENT_DATE)
            AND (c.max_participants IS NULL OR (
                SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id
            ) < c.max_participants)
            AND (
                c.visibility = 'public'
                OR c.created_by_id = auth.uid()
                OR (c.visibility = 'community' AND EXISTS (
                    SELECT 1 FROM community_members 
                    WHERE community_id = c.community_id AND user_id = auth.uid()
                ))
            )
        )
        OR is_admin()
    );

CREATE POLICY "Challenge Participants: Read own or challenge participants" ON challenge_participants
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM challenge_participants cp2
            WHERE cp2.challenge_id = challenge_participants.challenge_id 
            AND cp2.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM challenges c
            WHERE c.id = challenge_participants.challenge_id
            AND (c.created_by_id = auth.uid() OR c.visibility = 'public')
        )
        OR is_admin()
    );

CREATE POLICY "Challenge Participants: Update own" ON challenge_participants
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Challenge Participants: Delete own (drop out)" ON challenge_participants
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- Challenge Daily Logs
CREATE POLICY "Challenge Daily Logs: Users can create own" ON challenge_daily_logs
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Challenge Daily Logs: Read own or challenge participants" ON challenge_daily_logs
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM challenge_participants cp
            WHERE cp.challenge_id = challenge_daily_logs.challenge_id 
            AND cp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM challenges c
            WHERE c.id = challenge_daily_logs.challenge_id
            AND (c.created_by_id = auth.uid() OR c.show_leaderboard = TRUE)
        )
        OR is_admin()
    );

CREATE POLICY "Challenge Daily Logs: Update own" ON challenge_daily_logs
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- Challenge Leaderboard
CREATE POLICY "Challenge Leaderboard: Read for challenge participants" ON challenge_leaderboard
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM challenge_participants cp
            WHERE cp.challenge_id = challenge_leaderboard.challenge_id 
            AND cp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM challenges c
            WHERE c.id = challenge_leaderboard.challenge_id
            AND (c.created_by_id = auth.uid() OR c.show_leaderboard = TRUE)
        )
        OR is_admin()
    );

CREATE POLICY "Challenge Leaderboard: System can update" ON challenge_leaderboard
    FOR ALL USING (is_admin());

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_challenge_templates_updated_at
    BEFORE UPDATE ON challenge_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
    BEFORE UPDATE ON challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_participants_updated_at
    BEFORE UPDATE ON challenge_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_leaderboard_updated_at
    BEFORE UPDATE ON challenge_leaderboard
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GRANTS
-- ============================================================

GRANT ALL ON challenge_templates TO authenticated;
GRANT ALL ON challenges TO authenticated;
GRANT ALL ON challenge_participants TO authenticated;
GRANT ALL ON challenge_daily_logs TO authenticated;
GRANT ALL ON challenge_leaderboard TO authenticated;

-- ============================================================
-- INSERT DEFAULT CHALLENGE TEMPLATES
-- ============================================================

INSERT INTO challenge_templates (name, slug, description, icon, color, duration_days, category, difficulty, daily_target_type, daily_target_value, streak_type, scoring_method, base_points, streak_bonus_points, completion_bonus_points, is_featured, tags, estimated_effort_minutes) VALUES
('7-Day Focus Challenge', '7-day-focus', 'Build a daily focus habit with 30 minutes of deep work every day for a week.', 'Target', 'bg-blue-500', 7, 'focus', 'beginner', 'focus_minutes', 30, 'consecutive', 'consistency', 10, 5, 100, TRUE, ARRAY['focus', 'deep-work', 'beginner'], 30),
('30-Day DSA Challenge', '30-day-dsa', 'Master Data Structures & Algorithms by solving problems daily for 30 days.', 'Code', 'bg-green-500', 30, 'dsa', 'intermediate', 'dsa_problems', 2, 'consecutive', 'consistency', 15, 10, 500, TRUE, ARRAY['dsa', 'algorithms', 'coding', 'interview-prep'], 45),
('21-Day Habit Challenge', '21-day-habit', 'Build a lasting habit by completing your chosen habit every day for 21 days.', 'Target', 'bg-purple-500', 21, 'habit', 'beginner', 'habits_completed', 1, 'consecutive', 'consistency', 10, 5, 200, TRUE, ARRAY['habits', 'consistency', 'lifestyle'], 15),
('14-Day No-Procrastination Challenge', '14-day-no-procrastination', 'Beat procrastination by completing at least 3 important tasks every day for 2 weeks.', 'CheckSquare', 'bg-orange-500', 14, 'productivity', 'intermediate', 'tasks_completed', 3, 'consecutive', 'consistency', 10, 5, 300, TRUE, ARRAY['productivity', 'procrastination', 'discipline'], 60),
('7-Day Learning Sprint', '7-day-learning-sprint', 'Dedicate 1 hour daily to learning a new skill or topic for 7 days.', 'BookOpen', 'bg-indigo-500', 7, 'learning', 'beginner', 'study_hours', 1, 'consecutive', 'consistency', 10, 5, 150, FALSE, ARRAY['learning', 'skill-building', 'education'], 60),
('30-Day Code Consistency', '30-day-code-consistency', 'Write code every day for 30 days - even if it is just 15 minutes.', 'Terminal', 'bg-teal-500', 30, 'coding', 'beginner', 'focus_minutes', 15, 'consecutive', 'consistency', 10, 5, 400, FALSE, ARRAY['coding', 'consistency', 'programming'], 15),
('14-Day Morning Routine', '14-day-morning-routine', 'Start your day right with a consistent morning routine for 2 weeks.', 'Sunrise', 'bg-yellow-500', 14, 'habit', 'beginner', 'habits_completed', 3, 'consecutive', 'consistency', 10, 5, 200, FALSE, ARRAY['morning-routine', 'habits', 'discipline'], 30);