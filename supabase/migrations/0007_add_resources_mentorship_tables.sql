-- ============================================================
-- PHASE 8: RESOURCE SHARING
-- ============================================================

-- Resource Categories
CREATE TABLE resource_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    parent_id UUID REFERENCES resource_categories(id) ON DELETE SET NULL
);

-- Resources (notes, roadmaps, links, materials, project ideas)
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Creator
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Community association (optional)
    community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- For notes, roadmaps, detailed content
    
    -- Type and category
    type TEXT NOT NULL, -- 'note', 'roadmap', 'link', 'course', 'video', 'article', 'project_idea', 'practice_resource', 'study_material'
    category_id UUID REFERENCES resource_categories(id) ON DELETE SET NULL,
    tags TEXT[],
    
    -- For links
    external_url TEXT,
    domain TEXT, -- Extracted from URL for display
    
    -- For files (future: Supabase Storage)
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    
    -- Metadata
    difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
    estimated_time_minutes INTEGER, -- For courses, videos, etc.
    language TEXT, -- Programming language if applicable
    topics TEXT[], -- Specific topics covered
    
    -- Quality indicators
    is_verified BOOLEAN NOT NULL DEFAULT FALSE, -- Verified by mentors/admins
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Stats (cached)
    views_count INTEGER NOT NULL DEFAULT 0,
    upvotes_count INTEGER NOT NULL DEFAULT 0,
    downvotes_count INTEGER NOT NULL DEFAULT 0,
    saves_count INTEGER NOT NULL DEFAULT 0,
    reports_count INTEGER NOT NULL DEFAULT 0,
    
    -- Moderation
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_reason TEXT,
    hidden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hidden_at TIMESTAMPTZ,
    
    -- Visibility
    visibility TEXT NOT NULL DEFAULT 'public' -- 'public', 'community', 'private'
);

-- Partial unique index for external_url (one per creator per URL)
CREATE UNIQUE INDEX IF NOT EXISTS resources_creator_external_url_unique
    ON resources (created_by_id, external_url)
    WHERE external_url IS NOT NULL;

-- Resource Votes (upvotes/downvotes)
CREATE TABLE resource_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL, -- 'upvote', 'downvote'
    UNIQUE(user_id, resource_id)
);

-- Saved Resources (bookmarks)
CREATE TABLE saved_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    UNIQUE(user_id, resource_id)
);

-- Resource Comments (discussions on resources)
CREATE TABLE resource_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES resource_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- PHASE 9: MENTORSHIP SECTION
-- ============================================================

-- Mentor Profiles (verified mentors)
CREATE TABLE mentor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    community_profile_id UUID REFERENCES community_profiles(id) ON DELETE CASCADE,
    
    -- Verification
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    -- Professional info
    title TEXT, -- e.g., 'Senior Software Engineer', 'ML Researcher'
    company TEXT,
    years_experience INTEGER,
    expertise_areas TEXT[], -- e.g., ['React', 'Node.js', 'System Design']
    specializations TEXT[], -- e.g., ['Frontend', 'Backend', 'AI/ML', 'DSA']
    
    -- Mentorship offerings
    offers_roadmaps BOOLEAN NOT NULL DEFAULT TRUE,
    offers_qa_sessions BOOLEAN NOT NULL DEFAULT TRUE,
    offers_live_sessions BOOLEAN NOT NULL DEFAULT FALSE,
    offers_code_review BOOLEAN NOT NULL DEFAULT FALSE,
    offers_career_guidance BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Availability
    availability_schedule JSONB DEFAULT '{}', -- {monday: ['18:00-20:00'], ...}
    timezone TEXT DEFAULT 'UTC',
    preferred_session_duration_minutes INTEGER DEFAULT 60,
    max_concurrent_mentees INTEGER DEFAULT 5,
    current_mentees_count INTEGER NOT NULL DEFAULT 0,
    
    -- Pricing (if applicable - future)
    is_free BOOLEAN NOT NULL DEFAULT TRUE,
    session_price_usd DECIMAL(10,2),
    
    -- Stats
    total_sessions_hosted INTEGER NOT NULL DEFAULT 0,
    total_mentees_helped INTEGER NOT NULL DEFAULT 0,
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    
    -- Social proof
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    twitter_url TEXT,
    
    -- Bio
    bio TEXT,
    teaching_philosophy TEXT,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    accepting_mentees BOOLEAN NOT NULL DEFAULT TRUE
);

-- Mentor Sessions (scheduled or recorded sessions)
CREATE TABLE mentor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Type
    type TEXT NOT NULL, -- 'live_qa', 'workshop', 'code_review', 'career_guidance', 'roadmap_planning', 'recorded'
    
    -- Schedule
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    timezone TEXT DEFAULT 'UTC',
    
    -- Capacity
    max_participants INTEGER DEFAULT 20, -- null = unlimited for recorded
    current_participants INTEGER NOT NULL DEFAULT 0,
    
    -- Access
    is_free BOOLEAN NOT NULL DEFAULT TRUE,
    price_usd DECIMAL(10,2),
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Content
    meeting_url TEXT, -- Zoom, Google Meet, etc.
    recording_url TEXT, -- After session
    materials JSONB DEFAULT '[]', -- Links to resources, slides, etc.
    
    -- Tags
    tags TEXT[],
    difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
    
    -- Status
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'completed', 'cancelled', 'archived'
    
    -- Community association (optional)
    community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
    
    -- Stats
    views_count INTEGER NOT NULL DEFAULT 0,
    registrations_count INTEGER NOT NULL DEFAULT 0,
    average_rating DECIMAL(3,2)
);

-- Mentor Session Registrations
CREATE TABLE mentor_session_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    session_id UUID NOT NULL REFERENCES mentor_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    status TEXT NOT NULL DEFAULT 'registered', -- 'registered', 'attended', 'cancelled', 'waitlisted'
    attended BOOLEAN NOT NULL DEFAULT FALSE,
    rating INTEGER, -- 1-5 after session
    feedback TEXT,
    
    UNIQUE(session_id, user_id)
);

-- Mentor Reviews
CREATE TABLE mentor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES mentor_sessions(id) ON DELETE SET NULL,
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    
    UNIQUE(mentor_id, user_id)
);

-- Mentor Roadmaps (structured learning paths)
CREATE TABLE mentor_roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    target_audience TEXT, -- e.g., 'Beginners wanting to become Frontend Developers'
    estimated_duration_weeks INTEGER,
    difficulty TEXT NOT NULL DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    
    -- Structure (JSON)
    phases JSONB NOT NULL DEFAULT '[]', -- [{name, description, duration_weeks, resources: [], milestones: []}]
    
    -- Tags
    tags TEXT[],
    skills_covered TEXT[],
    prerequisites TEXT[],
    
    -- Stats
    enrollments_count INTEGER NOT NULL DEFAULT 0,
    completions_count INTEGER NOT NULL DEFAULT 0,
    average_rating DECIMAL(3,2),
    
    -- Access
    is_free BOOLEAN NOT NULL DEFAULT TRUE,
    price_usd DECIMAL(10,2),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Featured
    is_featured BOOLEAN NOT NULL DEFAULT FALSE
);

-- Mentor Roadmap Enrollments
CREATE TABLE mentor_roadmap_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    roadmap_id UUID NOT NULL REFERENCES mentor_roadmaps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused', 'dropped'
    current_phase INTEGER NOT NULL DEFAULT 0,
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    UNIQUE(roadmap_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Resources
CREATE INDEX idx_resource_categories_parent ON resource_categories(parent_id);
CREATE INDEX idx_resource_categories_active ON resource_categories(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_resources_created_by ON resources(created_by_id);
CREATE INDEX idx_resources_community ON resources(community_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_category ON resources(category_id);
CREATE INDEX idx_resources_visibility ON resources(visibility);
CREATE INDEX idx_resources_is_verified ON resources(is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_resources_is_featured ON resources(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX idx_resources_topics ON resources USING GIN(topics);
CREATE INDEX idx_resources_upvotes ON resources(upvotes_count DESC);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);

CREATE INDEX idx_resource_votes_resource ON resource_votes(resource_id);
CREATE INDEX idx_resource_votes_user ON resource_votes(user_id);

CREATE INDEX idx_saved_resources_user ON saved_resources(user_id);
CREATE INDEX idx_saved_resources_resource ON saved_resources(resource_id);

CREATE INDEX idx_resource_comments_resource ON resource_comments(resource_id);
CREATE INDEX idx_resource_comments_user ON resource_comments(created_by_id);
CREATE INDEX idx_resource_comments_parent ON resource_comments(parent_id);

-- Mentorship
CREATE INDEX idx_mentor_profiles_user ON mentor_profiles(user_id);
CREATE INDEX idx_mentor_profiles_verified ON mentor_profiles(is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_mentor_profiles_active ON mentor_profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_mentor_profiles_accepting ON mentor_profiles(accepting_mentees) WHERE accepting_mentees = TRUE;
CREATE INDEX idx_mentor_profiles_expertise ON mentor_profiles USING GIN(expertise_areas);

CREATE INDEX idx_mentor_sessions_mentor ON mentor_sessions(mentor_id);
CREATE INDEX idx_mentor_sessions_scheduled ON mentor_sessions(scheduled_at);
CREATE INDEX idx_mentor_sessions_status ON mentor_sessions(status);
CREATE INDEX idx_mentor_sessions_community ON mentor_sessions(community_id);
CREATE INDEX idx_mentor_sessions_type ON mentor_sessions(type);

CREATE INDEX idx_mentor_session_regs_session ON mentor_session_registrations(session_id);
CREATE INDEX idx_mentor_session_regs_user ON mentor_session_registrations(user_id);
CREATE INDEX idx_mentor_session_regs_status ON mentor_session_registrations(status);

CREATE INDEX idx_mentor_reviews_mentor ON mentor_reviews(mentor_id);
CREATE INDEX idx_mentor_reviews_user ON mentor_reviews(user_id);

CREATE INDEX idx_mentor_roadmaps_mentor ON mentor_roadmaps(mentor_id);
CREATE INDEX idx_mentor_roadmaps_published ON mentor_roadmaps(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_mentor_roadmaps_featured ON mentor_roadmaps(is_featured) WHERE is_featured = TRUE;

CREATE INDEX idx_mentor_roadmap_enrollments_roadmap ON mentor_roadmap_enrollments(roadmap_id);
CREATE INDEX idx_mentor_roadmap_enrollments_user ON mentor_roadmap_enrollments(user_id);
CREATE INDEX idx_mentor_roadmap_enrollments_status ON mentor_roadmap_enrollments(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_session_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_roadmap_enrollments ENABLE ROW LEVEL SECURITY;

-- Resource Categories: Read all active
CREATE POLICY "Resource Categories: Read active" ON resource_categories
    FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Resource Categories: Admin manage" ON resource_categories
    FOR ALL USING (is_admin());

-- Resources: Read access
CREATE POLICY "Resources: Read public" ON resources
    FOR SELECT USING (
        is_hidden = FALSE
        AND (
            visibility = 'public'
            OR created_by_id = auth.uid()
            OR (visibility = 'community' AND community_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM community_members 
                WHERE community_id = resources.community_id AND user_id = auth.uid()
            ))
        )
        OR is_admin()
    );

CREATE POLICY "Resources: Users can create" ON resources
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());

CREATE POLICY "Resources: Creator can update" ON resources
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());

CREATE POLICY "Resources: Creator can delete" ON resources
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Resource Votes
CREATE POLICY "Resource Votes: Users can vote" ON resource_votes
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Resource Votes: Read all" ON resource_votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM resources r
            WHERE r.id = resource_votes.resource_id
            AND (r.visibility = 'public' OR r.created_by_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Resource Votes: Update own" ON resource_votes
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Resource Votes: Delete own" ON resource_votes
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- Saved Resources
CREATE POLICY "Saved Resources: Users can save" ON saved_resources
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Saved Resources: Read own" ON saved_resources
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Saved Resources: Delete own" ON saved_resources
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- Resource Comments
CREATE POLICY "Resource Comments: Users can comment" ON resource_comments
    FOR INSERT WITH CHECK (
        created_by_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM resources r
            WHERE r.id = resource_comments.resource_id
            AND (r.visibility = 'public' OR r.created_by_id = auth.uid() OR (r.visibility = 'community' AND EXISTS (
                SELECT 1 FROM community_members WHERE community_id = r.community_id AND user_id = auth.uid()
            )))
        )
        OR is_admin()
    );

CREATE POLICY "Resource Comments: Read on readable resources" ON resource_comments
    FOR SELECT USING (
        is_hidden = FALSE
        AND EXISTS (
            SELECT 1 FROM resources r
            WHERE r.id = resource_comments.resource_id
            AND (r.visibility = 'public' OR r.created_by_id = auth.uid() OR (r.visibility = 'community' AND EXISTS (
                SELECT 1 FROM community_members WHERE community_id = r.community_id AND user_id = auth.uid()
            )))
        )
        OR is_admin()
    );

CREATE POLICY "Resource Comments: Update own" ON resource_comments
    FOR UPDATE USING (created_by_id = auth.uid() OR is_admin());

CREATE POLICY "Resource Comments: Delete own" ON resource_comments
    FOR DELETE USING (created_by_id = auth.uid() OR is_admin());

-- Mentor Profiles
CREATE POLICY "Mentor Profiles: Read verified/active" ON mentor_profiles
    FOR SELECT USING (
        (is_verified = TRUE AND is_active = TRUE)
        OR user_id = auth.uid()
        OR is_admin()
    );

CREATE POLICY "Mentor Profiles: Users can create own" ON mentor_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Mentor Profiles: Update own" ON mentor_profiles
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Mentor Profiles: Delete own" ON mentor_profiles
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Mentor Profiles: Admin can verify" ON mentor_profiles
    FOR UPDATE USING (is_admin());

-- Mentor Sessions
CREATE POLICY "Mentor Sessions: Read public/registered" ON mentor_sessions
    FOR SELECT USING (
        (is_free = TRUE OR EXISTS (
            SELECT 1 FROM mentor_session_registrations msr
            WHERE msr.session_id = mentor_sessions.id AND msr.user_id = auth.uid()
        ))
        AND status != 'archived'
        OR mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY "Mentor Sessions: Mentors can create" ON mentor_sessions
    FOR INSERT WITH CHECK (
        mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY "Mentor Sessions: Mentor can update" ON mentor_sessions
    FOR UPDATE USING (
        mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY "Mentor Sessions: Mentor can delete" ON mentor_sessions
    FOR DELETE USING (
        mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        OR is_admin()
    );

-- Mentor Session Registrations
CREATE POLICY "Mentor Session Registrations: Users can register" ON mentor_session_registrations
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Mentor Session Registrations: Read own or mentor" ON mentor_session_registrations
    FOR SELECT USING (
        user_id = auth.uid()
        OR session_id IN (
            SELECT id FROM mentor_sessions 
            WHERE mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY "Mentor Session Registrations: Update own" ON mentor_session_registrations
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Mentor Session Registrations: Delete own" ON mentor_session_registrations
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- Mentor Reviews
CREATE POLICY "Mentor Reviews: Users can review attended sessions" ON mentor_reviews
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM mentor_session_registrations msr
            WHERE msr.session_id = mentor_reviews.session_id
            AND msr.user_id = auth.uid()
            AND msr.attended = TRUE
        )
        OR is_admin()
    );

CREATE POLICY "Mentor Reviews: Read public or own" ON mentor_reviews
    FOR SELECT USING (
        is_public = TRUE
        OR user_id = auth.uid()
        OR mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY "Mentor Reviews: Update own" ON mentor_reviews
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Mentor Reviews: Delete own" ON mentor_reviews
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- Mentor Roadmaps
CREATE POLICY "Mentor Roadmaps: Read published" ON mentor_roadmaps
    FOR SELECT USING (
        is_published = TRUE
        OR mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY "Mentor Roadmaps: Mentors can create" ON mentor_roadmaps
    FOR INSERT WITH CHECK (
        mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY "Mentor Roadmaps: Mentor can update" ON mentor_roadmaps
    FOR UPDATE USING (
        mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY "Mentor Roadmaps: Mentor can delete" ON mentor_roadmaps
    FOR DELETE USING (
        mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        OR is_admin()
    );

-- Mentor Roadmap Enrollments
CREATE POLICY "Mentor Roadmap Enrollments: Users can enroll" ON mentor_roadmap_enrollments
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Mentor Roadmap Enrollments: Read own or mentor" ON mentor_roadmap_enrollments
    FOR SELECT USING (
        user_id = auth.uid()
        OR roadmap_id IN (
            SELECT id FROM mentor_roadmaps 
            WHERE mentor_id IN (SELECT id FROM mentor_profiles WHERE user_id = auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY "Mentor Roadmap Enrollments: Update own" ON mentor_roadmap_enrollments
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Mentor Roadmap Enrollments: Delete own" ON mentor_roadmap_enrollments
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_resource_categories_updated_at
    BEFORE UPDATE ON resource_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_comments_updated_at
    BEFORE UPDATE ON resource_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_profiles_updated_at
    BEFORE UPDATE ON mentor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_sessions_updated_at
    BEFORE UPDATE ON mentor_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_reviews_updated_at
    BEFORE UPDATE ON mentor_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_roadmaps_updated_at
    BEFORE UPDATE ON mentor_roadmaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_roadmap_enrollments_updated_at
    BEFORE UPDATE ON mentor_roadmap_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GRANTS
-- ============================================================

GRANT ALL ON resource_categories TO authenticated;
GRANT ALL ON resources TO authenticated;
GRANT ALL ON resource_votes TO authenticated;
GRANT ALL ON saved_resources TO authenticated;
GRANT ALL ON resource_comments TO authenticated;

GRANT ALL ON mentor_profiles TO authenticated;
GRANT ALL ON mentor_sessions TO authenticated;
GRANT ALL ON mentor_session_registrations TO authenticated;
GRANT ALL ON mentor_reviews TO authenticated;
GRANT ALL ON mentor_roadmaps TO authenticated;
GRANT ALL ON mentor_roadmap_enrollments TO authenticated;

-- ============================================================
-- INSERT DEFAULT RESOURCE CATEGORIES
-- ============================================================

INSERT INTO resource_categories (name, slug, description, icon, color, sort_order) VALUES
('Notes', 'notes', 'Handwritten or typed study notes', 'FileText', 'bg-blue-500', 1),
('Roadmaps', 'roadmaps', 'Structured learning paths and career roadmaps', 'Map', 'bg-green-500', 2),
('Courses', 'courses', 'Online courses and certifications', 'GraduationCap', 'bg-purple-500', 3),
('Videos', 'videos', 'Educational videos and tutorials', 'Video', 'bg-red-500', 4),
('Articles', 'articles', 'Blog posts, articles, and documentation', 'FileText', 'bg-indigo-500', 5),
('Practice Resources', 'practice', 'Practice problems, exercises, and coding challenges', 'Code', 'bg-orange-500', 6),
('Project Ideas', 'projects', 'Project ideas and portfolio projects', 'Lightbulb', 'bg-yellow-500', 7),
('Study Materials', 'materials', 'PDFs, cheat sheets, and reference materials', 'BookOpen', 'bg-teal-500', 8),
('Tools', 'tools', 'Development tools and productivity apps', 'Wrench', 'bg-pink-500', 9),
('Communities', 'communities', 'External communities and forums', 'Users', 'bg-cyan-500', 10);