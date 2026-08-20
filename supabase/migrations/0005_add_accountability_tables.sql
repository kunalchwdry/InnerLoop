-- ============================================================
-- PHASE 3: ACCOUNTABILITY PARTNERS SYSTEM
-- ============================================================

-- Accountability Profiles (extends community profile with accountability-specific data)
CREATE TABLE accountability_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    community_profile_id UUID REFERENCES community_profiles(id) ON DELETE CASCADE,
    
    -- Public goal
    current_goal TEXT,
    goal_description TEXT,
    goal_category TEXT, -- e.g., 'DSA', 'AI/ML', 'Web Dev', 'Exams', 'Habits'
    goal_target TEXT, -- e.g., '30 min daily', 'Complete 100 problems'
    goal_start_date DATE,
    goal_end_date DATE,
    
    -- Privacy settings
    show_goal_publicly BOOLEAN NOT NULL DEFAULT TRUE,
    show_progress_to_partners BOOLEAN NOT NULL DEFAULT TRUE,
    show_streak_to_partners BOOLEAN NOT NULL DEFAULT TRUE,
    show_study_time_to_partners BOOLEAN NOT NULL DEFAULT FALSE,
    allow_partner_requests BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Stats (computed/cached)
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_days_active INTEGER NOT NULL DEFAULT 0,
    partners_count INTEGER NOT NULL DEFAULT 0,
    last_check_in TIMESTAMPTZ,
    
    -- Preferences
    preferred_checkin_time TIME, -- e.g., '22:00' for evening check-in
    timezone TEXT DEFAULT 'UTC',
    reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    UNIQUE(user_id)
);

-- Accountability Partnerships (pairs of users)
CREATE TABLE accountability_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'ended'
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    responded_at TIMESTAMPTZ,
    
    -- Shared goal (optional)
    shared_goal TEXT,
    shared_goal_category TEXT,
    
    -- Settings
    share_daily_progress BOOLEAN NOT NULL DEFAULT TRUE,
    share_weekly_summary BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_checkin BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_milestone BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_streak_risk BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Stats
    days_together INTEGER NOT NULL DEFAULT 0,
    mutual_streak INTEGER NOT NULL DEFAULT 0,
    longest_mutual_streak INTEGER NOT NULL DEFAULT 0,
    
    UNIQUE(user_id, partner_id)
);

-- Accountability Check-ins (daily progress updates)
CREATE TABLE accountability_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If part of a partnership check-in
    
    -- Progress data
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    study_minutes INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    habits_completed INTEGER NOT NULL DEFAULT 0,
    focus_sessions INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    mood INTEGER, -- 1-5 scale
    
    -- Streak
    streak_day INTEGER NOT NULL DEFAULT 0,
    is_streak_continuing BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Source
    source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'auto_tasks', 'auto_habits', 'auto_focus', 'shared_progress_card'
    
    UNIQUE(user_id, date)
);

-- Encouragement Messages between partners
CREATE TABLE encouragement_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partnership_id UUID REFERENCES accountability_partners(id) ON DELETE SET NULL,
    
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'encouragement', -- 'encouragement', 'celebration', 'check_in', 'custom'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- Can be linked to a check-in
    checkin_id UUID REFERENCES accountability_checkins(id) ON DELETE SET NULL,
    
    CONSTRAINT no_self_encouragement CHECK (sender_id != recipient_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_accountability_profiles_user_id ON accountability_profiles(user_id);
CREATE INDEX idx_accountability_profiles_category ON accountability_profiles(goal_category);
CREATE INDEX idx_accountability_profiles_allow_requests ON accountability_profiles(allow_partner_requests) WHERE allow_partner_requests = TRUE;
CREATE INDEX idx_accountability_profiles_show_public ON accountability_profiles(show_goal_publicly) WHERE show_goal_publicly = TRUE;

CREATE INDEX idx_accountability_partners_user_id ON accountability_partners(user_id);
CREATE INDEX idx_accountability_partners_partner_id ON accountability_partners(partner_id);
CREATE INDEX idx_accountability_partners_status ON accountability_partners(status);
CREATE INDEX idx_accountability_partners_pair ON accountability_partners(user_id, partner_id);

CREATE INDEX idx_accountability_checkins_user_id ON accountability_checkins(user_id);
CREATE INDEX idx_accountability_checkins_date ON accountability_checkins(user_id, date DESC);
CREATE INDEX idx_accountability_checkins_partner ON accountability_checkins(partner_id, date DESC);

CREATE INDEX idx_encouragement_recipient ON encouragement_messages(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_encouragement_sender ON encouragement_messages(sender_id);
CREATE INDEX idx_encouragement_partnership ON encouragement_messages(partnership_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE accountability_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE encouragement_messages ENABLE ROW LEVEL SECURITY;

-- Accountability Profiles Policies
CREATE POLICY "Accountability Profiles: Users can create own" ON accountability_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Accountability Profiles: Read public or own or partner" ON accountability_profiles
    FOR SELECT USING (
        show_goal_publicly = TRUE
        OR user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM accountability_partners ap
            WHERE ap.status = 'accepted'
            AND ((ap.user_id = auth.uid() AND ap.partner_id = accountability_profiles.user_id)
                 OR (ap.partner_id = auth.uid() AND ap.user_id = accountability_profiles.user_id))
            AND ap.share_daily_progress = TRUE
        )
        OR is_admin()
    );

CREATE POLICY "Accountability Profiles: Update own" ON accountability_profiles
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Accountability Profiles: Delete own" ON accountability_profiles
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- Accountability Partners Policies
CREATE POLICY "Accountability Partners: Users can request" ON accountability_partners
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        AND requested_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM accountability_profiles 
            WHERE user_id = accountability_partners.partner_id 
            AND allow_partner_requests = TRUE
        )
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks 
            WHERE blocker_id = partner_id AND blocked_id = auth.uid()
        )
        OR is_admin()
    );

CREATE POLICY "Accountability Partners: Read own partnerships" ON accountability_partners
    FOR SELECT USING (
        user_id = auth.uid() 
        OR partner_id = auth.uid()
        OR is_admin()
    );

CREATE POLICY "Accountability Partners: Update own (respond, settings)" ON accountability_partners
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR partner_id = auth.uid()
        OR is_admin()
    );

CREATE POLICY "Accountability Partners: Delete own (end partnership)" ON accountability_partners
    FOR DELETE USING (
        user_id = auth.uid() 
        OR partner_id = auth.uid()
        OR is_admin()
    );

-- Accountability Check-ins Policies
CREATE POLICY "Accountability Checkins: Users can create own" ON accountability_checkins
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Accountability Checkins: Read own or partner's (if shared)" ON accountability_checkins
    FOR SELECT USING (
        user_id = auth.uid()
        OR (
            partner_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM accountability_partners ap
                WHERE ap.status = 'accepted'
                AND ((ap.user_id = auth.uid() AND ap.partner_id = accountability_checkins.user_id)
                     OR (ap.partner_id = auth.uid() AND ap.user_id = accountability_checkins.user_id))
                AND ap.share_daily_progress = TRUE
            )
        )
        OR is_admin()
    );

CREATE POLICY "Accountability Checkins: Update own" ON accountability_checkins
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Accountability Checkins: Delete own" ON accountability_checkins
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- Encouragement Messages Policies
CREATE POLICY "Encouragement: Users can send" ON encouragement_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks 
            WHERE blocker_id = recipient_id AND blocked_id = sender_id
        )
        AND (
            recipient_id IN (
                SELECT partner_id FROM accountability_partners 
                WHERE user_id = auth.uid() AND status = 'accepted'
                UNION
                SELECT user_id FROM accountability_partners 
                WHERE partner_id = auth.uid() AND status = 'accepted'
            )
            OR EXISTS (
                SELECT 1 FROM community_profiles 
                WHERE user_id = recipient_id AND allow_direct_messages = TRUE
            )
        )
        OR is_admin()
    );

CREATE POLICY "Encouragement: Read own sent/received" ON encouragement_messages
    FOR SELECT USING (
        sender_id = auth.uid() 
        OR recipient_id = auth.uid()
        OR is_admin()
    );

CREATE POLICY "Encouragement: Update own (mark read)" ON encouragement_messages
    FOR UPDATE USING (
        sender_id = auth.uid() 
        OR recipient_id = auth.uid()
        OR is_admin()
    );

CREATE POLICY "Encouragement: Delete own sent" ON encouragement_messages
    FOR DELETE USING (
        sender_id = auth.uid() 
        OR recipient_id = auth.uid()
        OR is_admin()
    );

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_accountability_profiles_updated_at
    BEFORE UPDATE ON accountability_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accountability_partners_updated_at
    BEFORE UPDATE ON accountability_partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GRANTS
-- ============================================================

GRANT ALL ON accountability_profiles TO authenticated;
GRANT ALL ON accountability_partners TO authenticated;
GRANT ALL ON accountability_checkins TO authenticated;
GRANT ALL ON encouragement_messages TO authenticated;