-- ============================================================
-- PHASE 10: SAFETY & MODERATION
-- ============================================================

-- Community Guidelines (versioned)
CREATE TABLE community_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Markdown content
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(version)
);

-- User Reports (extends existing reports table with more detail)
-- Using the existing 'reports' table from migration 0004, adding more specific policies here

-- Report Categories for better organization
CREATE TABLE report_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    requires_immediate_action BOOLEAN NOT NULL DEFAULT FALSE,
    auto_hide_threshold INTEGER DEFAULT 3, -- Auto-hide after N reports
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Content Moderation Queue (for moderators)
CREATE TABLE moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Reference to reported content
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    reported_content_type TEXT NOT NULL, -- 'post', 'comment', 'direct_message', 'resource', 'resource_comment', 'mentor_session', 'mentor_review'
    reported_content_id UUID NOT NULL,
    
    -- Auto-detection
    auto_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    auto_flag_reason TEXT, -- 'toxicity', 'spam', 'pii', 'profanity', 'off_topic'
    toxicity_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Assignment
    assigned_moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'resolved', 'dismissed', 'escalated'
    priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Resolution
    resolution TEXT, -- 'content_removed', 'content_hidden', 'user_warned', 'user_suspended', 'user_banned', 'dismissed', 'no_action_needed'
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    
    -- Appeal
    appealed BOOLEAN NOT NULL DEFAULT FALSE,
    appeal_reason TEXT,
    appeal_status TEXT, -- 'pending', 'approved', 'denied'
    appeal_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    appeal_reviewed_at TIMESTAMPTZ
);

-- User Warnings (progressive discipline)
CREATE TABLE user_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    
    reason TEXT NOT NULL,
    category_id UUID REFERENCES report_categories(id) ON DELETE SET NULL,
    
    -- Severity
    severity TEXT NOT NULL DEFAULT 'warning', -- 'warning', 'strike_1', 'strike_2', 'strike_3', 'suspension', 'ban'
    
    -- Duration (for suspensions)
    expires_at TIMESTAMPTZ, -- NULL = permanent
    
    -- Details
    notes TEXT,
    evidence JSONB DEFAULT '{}', -- Links to reported content
    
    -- Appeal
    appealed BOOLEAN NOT NULL DEFAULT FALSE,
    appeal_status TEXT, -- 'pending', 'approved', 'denied'
    appeal_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    appeal_reviewed_at TIMESTAMPTZ
);

-- User Suspensions/Bans
CREATE TABLE user_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL, -- 'suspension', 'ban', 'feature_restriction'
    reason TEXT NOT NULL,
    
    -- For suspensions
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ, -- NULL = permanent
    
    -- For feature restrictions
    restricted_features TEXT[], -- ['posting', 'commenting', 'messaging', 'creating_communities', 'joining_challenges']
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'revoked', 'appealed'
    
    -- Appeal
    appealed BOOLEAN NOT NULL DEFAULT FALSE,
    appeal_status TEXT,
    appeal_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    appeal_reviewed_at TIMESTAMPTZ,
    
    notes TEXT
);

-- Spam Detection Log (for ML-based detection)
CREATE TABLE spam_detection_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'post', 'comment', 'direct_message', 'resource'
    content_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    
    -- Detection results
    is_spam BOOLEAN NOT NULL DEFAULT FALSE,
    spam_score DECIMAL(3,2) NOT NULL DEFAULT 0,
    spam_signals JSONB DEFAULT '[]', -- ['duplicate_content', 'excessive_links', 'keyword_stuffing', 'new_account', 'rapid_posting']
    
    -- Action taken
    action_taken TEXT, -- 'none', 'flagged', 'hidden', 'user_warned'
    reviewed_by_moderator BOOLEAN NOT NULL DEFAULT FALSE
);

-- Toxicity Detection Log
CREATE TABLE toxicity_detection_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    
    -- Detection results
    is_toxic BOOLEAN NOT NULL DEFAULT FALSE,
    toxicity_score DECIMAL(3,2) NOT NULL DEFAULT 0,
    toxicity_categories JSONB DEFAULT '[]', -- ['harassment', 'hate_speech', 'threats', 'sexual_content', 'violence', 'self_harm']
    
    -- Action taken
    action_taken TEXT, -- 'none', 'flagged', 'hidden', 'user_warned'
    reviewed_by_moderator BOOLEAN NOT NULL DEFAULT FALSE
);

-- PII Detection Log (Personal Identifiable Information)
CREATE TABLE pii_detection_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    
    -- Detection results
    has_pii BOOLEAN NOT NULL DEFAULT FALSE,
    pii_types JSONB DEFAULT '[]', -- ['email', 'phone', 'address', 'ssn', 'credit_card', 'full_name', 'school', 'workplace']
    pii_locations JSONB DEFAULT '[]', -- [{type, start, end, confidence}]
    
    -- Action taken
    action_taken TEXT, -- 'none', 'flagged', 'auto_redacted', 'user_notified'
    reviewed_by_moderator BOOLEAN NOT NULL DEFAULT FALSE
);

-- User Privacy Settings (comprehensive)
CREATE TABLE user_privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile visibility
    show_profile_to_public BOOLEAN NOT NULL DEFAULT TRUE,
    show_profile_to_community_members BOOLEAN NOT NULL DEFAULT TRUE,
    show_email BOOLEAN NOT NULL DEFAULT FALSE,
    show_full_name BOOLEAN NOT NULL DEFAULT TRUE,
    show_avatar BOOLEAN NOT NULL DEFAULT TRUE,
    show_bio BOOLEAN NOT NULL DEFAULT TRUE,
    show_subjects BOOLEAN NOT NULL DEFAULT TRUE,
    show_interests BOOLEAN NOT NULL DEFAULT TRUE,
    show_skills BOOLEAN NOT NULL DEFAULT TRUE,
    show_learning_goals BOOLEAN NOT NULL DEFAULT TRUE,
    show_stats BOOLEAN NOT NULL DEFAULT TRUE, -- posts_count, helpful_count, etc.
    show_communities BOOLEAN NOT NULL DEFAULT TRUE,
    show_badges BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Activity visibility
    show_online_status BOOLEAN NOT NULL DEFAULT TRUE,
    show_last_active BOOLEAN NOT NULL DEFAULT TRUE,
    show_reading_activity BOOLEAN NOT NULL DEFAULT FALSE, -- What posts viewing
    
    -- Productivity data visibility (InnerLoop integration)
    show_focus_sessions BOOLEAN NOT NULL DEFAULT FALSE,
    show_tasks_completed BOOLEAN NOT NULL DEFAULT FALSE,
    show_habits_completed BOOLEAN NOT NULL DEFAULT FALSE,
    show_streaks BOOLEAN NOT NULL DEFAULT FALSE,
    show_study_hours BOOLEAN NOT NULL DEFAULT FALSE,
    show_analytics BOOLEAN NOT NULL DEFAULT FALSE,
    allow_progress_sharing BOOLEAN NOT NULL DEFAULT TRUE, -- Allow "Share progress" button
    
    -- Communication
    allow_direct_messages BOOLEAN NOT NULL DEFAULT TRUE,
    allow_dms_from TEXT NOT NULL DEFAULT 'everyone', -- 'everyone', 'followers', 'community_members', 'partners', 'none'
    allow_community_invites BOOLEAN NOT NULL DEFAULT TRUE,
    allow_challenge_invites BOOLEAN NOT NULL DEFAULT TRUE,
    allow_partner_requests BOOLEAN NOT NULL DEFAULT TRUE,
    allow_mentor_requests BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Notifications
    notify_new_follower BOOLEAN NOT NULL DEFAULT TRUE,
    notify_post_like BOOLEAN NOT NULL DEFAULT TRUE,
    notify_post_comment BOOLEAN NOT NULL DEFAULT TRUE,
    notify_post_reply BOOLEAN NOT NULL DEFAULT TRUE,
    notify_mention BOOLEAN NOT NULL DEFAULT TRUE,
    notify_direct_message BOOLEAN NOT NULL DEFAULT TRUE,
    notify_community_post BOOLEAN NOT NULL DEFAULT TRUE,
    notify_challenge_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    notify_challenge_milestone BOOLEAN NOT NULL DEFAULT TRUE,
    notify_partner_checkin BOOLEAN NOT NULL DEFAULT TRUE,
    notify_partner_message BOOLEAN NOT NULL DEFAULT TRUE,
    notify_mentor_session BOOLEAN NOT NULL DEFAULT TRUE,
    notify_weekly_digest BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Data & Analytics
    allow_analytics_tracking BOOLEAN NOT NULL DEFAULT TRUE,
    allow_personalized_feed BOOLEAN NOT NULL DEFAULT TRUE,
    allow_data_export BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Safety
    filter_mature_content BOOLEAN NOT NULL DEFAULT TRUE,
    hide_reported_content BOOLEAN NOT NULL DEFAULT TRUE,
    auto_block_spam_accounts BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Account
    show_in_search BOOLEAN NOT NULL DEFAULT TRUE,
    show_in_leaderboards BOOLEAN NOT NULL DEFAULT TRUE,
    allow_ai_training_on_data BOOLEAN NOT NULL DEFAULT FALSE
);

-- Content Filtering Rules (admin configurable)
CREATE TABLE content_filter_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Rule definition
    rule_type TEXT NOT NULL, -- 'keyword', 'regex', 'ml_model', 'pii_pattern'
    pattern TEXT NOT NULL, -- Keyword, regex pattern, or model identifier
    categories TEXT[], -- Which content types to apply to
    
    -- Action
    action TEXT NOT NULL DEFAULT 'flag', -- 'flag', 'hide', 'block', 'warn_user', 'auto_reject'
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Scope
    applies_to TEXT NOT NULL DEFAULT 'all', -- 'all', 'posts', 'comments', 'messages', 'resources', 'bios'
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Testing
    test_mode BOOLEAN NOT NULL DEFAULT FALSE -- If true, only logs matches, doesn't act
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_report_categories_slug ON report_categories(slug);
CREATE INDEX idx_report_categories_severity ON report_categories(severity);

CREATE INDEX idx_moderation_queue_report ON moderation_queue(report_id);
CREATE INDEX idx_moderation_queue_content ON moderation_queue(reported_content_type, reported_content_id);
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_priority ON moderation_queue(priority, created_at);
CREATE INDEX idx_moderation_queue_assigned ON moderation_queue(assigned_moderator_id);
CREATE INDEX idx_moderation_queue_auto_flagged ON moderation_queue(auto_flagged) WHERE auto_flagged = TRUE;

CREATE INDEX idx_user_warnings_user ON user_warnings(user_id);
CREATE INDEX idx_user_warnings_moderator ON user_warnings(moderator_id);
CREATE INDEX idx_user_warnings_report ON user_warnings(report_id);
CREATE INDEX idx_user_warnings_severity ON user_warnings(severity);
CREATE INDEX idx_user_warnings_active ON user_warnings(user_id, expires_at) WHERE expires_at IS NULL;

CREATE INDEX idx_user_sanctions_user ON user_sanctions(user_id);
CREATE INDEX idx_user_sanctions_moderator ON user_sanctions(moderator_id);
CREATE INDEX idx_user_sanctions_type ON user_sanctions(type);
CREATE INDEX idx_user_sanctions_status ON user_sanctions(status);
CREATE INDEX idx_user_sanctions_active ON user_sanctions(user_id, ends_at) WHERE status = 'active' AND ends_at IS NULL;

CREATE INDEX idx_spam_detection_user ON spam_detection_log(user_id);
CREATE INDEX idx_spam_detection_content ON spam_detection_log(content_type, content_id);
CREATE INDEX idx_spam_detection_spam ON spam_detection_log(is_spam) WHERE is_spam = TRUE;

CREATE INDEX idx_toxicity_detection_user ON toxicity_detection_log(user_id);
CREATE INDEX idx_toxicity_detection_content ON toxicity_detection_log(content_type, content_id);
CREATE INDEX idx_toxicity_detection_toxic ON toxicity_detection_log(is_toxic) WHERE is_toxic = TRUE;

CREATE INDEX idx_pii_detection_user ON pii_detection_log(user_id);
CREATE INDEX idx_pii_detection_content ON pii_detection_log(content_type, content_id);
CREATE INDEX idx_pii_detection_has_pii ON pii_detection_log(has_pii) WHERE has_pii = TRUE;

CREATE INDEX idx_user_privacy_settings_user ON user_privacy_settings(user_id);

CREATE INDEX idx_content_filter_rules_active ON content_filter_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_content_filter_rules_type ON content_filter_rules(rule_type);
CREATE INDEX idx_content_filter_rules_applies_to ON content_filter_rules(applies_to);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE community_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spam_detection_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE toxicity_detection_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii_detection_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_filter_rules ENABLE ROW LEVEL SECURITY;

-- Community Guidelines: Read active
CREATE POLICY "Community Guidelines: Read active" ON community_guidelines
    FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Community Guidelines: Admin manage" ON community_guidelines
    FOR ALL USING (is_admin());

-- Report Categories: Read all
CREATE POLICY "Report Categories: Read all" ON report_categories
    FOR SELECT USING (TRUE);

CREATE POLICY "Report Categories: Admin manage" ON report_categories
    FOR ALL USING (is_admin());

-- Moderation Queue: Moderators and admins only
CREATE POLICY "Moderation Queue: Moderators can read" ON moderation_queue
    FOR SELECT USING (
        is_admin()
        OR assigned_moderator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM community_members cm
            JOIN communities c ON c.id = cm.community_id
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin', 'moderator')
            AND (
                (moderation_queue.reported_content_type = 'post' AND EXISTS (
                    SELECT 1 FROM posts p WHERE p.id = moderation_queue.reported_content_id AND p.community_id = c.id
                ))
                OR (moderation_queue.reported_content_type = 'comment' AND EXISTS (
                    SELECT 1 FROM comments co
                    JOIN posts p ON p.id = co.post_id
                    WHERE co.id = moderation_queue.reported_content_id AND p.community_id = c.id
                ))
                OR (moderation_queue.reported_content_type = 'resource' AND EXISTS (
                    SELECT 1 FROM resources r WHERE r.id = moderation_queue.reported_content_id AND r.community_id = c.id
                ))
            )
        )
    );

CREATE POLICY "Moderation Queue: Moderators can update" ON moderation_queue
    FOR UPDATE USING (
        is_admin()
        OR assigned_moderator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM community_members cm
            JOIN communities c ON c.id = cm.community_id
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- User Warnings: User can read own, moderators can read all
CREATE POLICY "User Warnings: Read own" ON user_warnings
    FOR SELECT USING (user_id = auth.uid() OR is_admin() OR EXISTS (
        SELECT 1 FROM community_members cm
        JOIN communities c ON c.id = cm.community_id
        WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin', 'moderator')
    ));

CREATE POLICY "User Warnings: Moderators can create" ON user_warnings
    FOR INSERT WITH CHECK (
        is_admin() OR EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

CREATE POLICY "User Warnings: Moderators can update" ON user_warnings
    FOR UPDATE USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- User Sanctions: Similar to warnings
CREATE POLICY "User Sanctions: Read own" ON user_sanctions
    FOR SELECT USING (user_id = auth.uid() OR is_admin() OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin', 'moderator')
    ));

CREATE POLICY "User Sanctions: Moderators can manage" ON user_sanctions
    FOR ALL USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- Detection Logs: Admins and moderators only
CREATE POLICY "Spam Detection: Admin/Moderator read" ON spam_detection_log
    FOR SELECT USING (is_admin() OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin', 'moderator')
    ));

CREATE POLICY "Toxicity Detection: Admin/Moderator read" ON toxicity_detection_log
    FOR SELECT USING (is_admin() OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin', 'moderator')
    ));

CREATE POLICY "PII Detection: Admin/Moderator read" ON pii_detection_log
    FOR SELECT USING (is_admin() OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin', 'moderator')
    ));

-- User Privacy Settings: Users manage own, admins can read
CREATE POLICY "User Privacy Settings: Read own" ON user_privacy_settings
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "User Privacy Settings: Manage own" ON user_privacy_settings
    FOR ALL USING (user_id = auth.uid() OR is_admin());

-- Content Filter Rules: Admins only
CREATE POLICY "Content Filter Rules: Admin manage" ON content_filter_rules
    FOR ALL USING (is_admin());

CREATE POLICY "Content Filter Rules: Moderators can read active" ON content_filter_rules
    FOR SELECT USING (
        is_active = TRUE 
        AND (is_admin() OR EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin', 'moderator')
        ))
    );

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_community_guidelines_updated_at
    BEFORE UPDATE ON community_guidelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moderation_queue_updated_at
    BEFORE UPDATE ON moderation_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sanctions_updated_at
    BEFORE UPDATE ON user_sanctions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_privacy_settings_updated_at
    BEFORE UPDATE ON user_privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_filter_rules_updated_at
    BEFORE UPDATE ON content_filter_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GRANTS
-- ============================================================

GRANT ALL ON community_guidelines TO authenticated;
GRANT ALL ON report_categories TO authenticated;
GRANT ALL ON moderation_queue TO authenticated;
GRANT ALL ON user_warnings TO authenticated;
GRANT ALL ON user_sanctions TO authenticated;
GRANT ALL ON spam_detection_log TO authenticated;
GRANT ALL ON toxicity_detection_log TO authenticated;
GRANT ALL ON pii_detection_log TO authenticated;
GRANT ALL ON user_privacy_settings TO authenticated;
GRANT ALL ON content_filter_rules TO authenticated;

-- ============================================================
-- INSERT DEFAULT DATA
-- ============================================================

-- Default Report Categories
INSERT INTO report_categories (name, slug, description, icon, color, severity, requires_immediate_action, auto_hide_threshold, sort_order) VALUES
('Harassment', 'harassment', 'Targeted harassment, bullying, or intimidation', 'AlertTriangle', 'bg-red-500', 'high', TRUE, 2, 1),
('Spam', 'spam', 'Unwanted promotional content, duplicate posts, or bot-like behavior', 'AlertCircle', 'bg-orange-500', 'medium', FALSE, 3, 2),
('Inappropriate Content', 'inappropriate_content', 'NSFW, offensive, or age-inappropriate material', 'EyeOff', 'bg-red-500', 'high', TRUE, 2, 3),
('Scam/Fraud', 'scam', 'Fraudulent schemes, phishing, or financial scams', 'ShieldAlert', 'bg-red-500', 'critical', TRUE, 1, 4),
('Bullying', 'bullying', 'Repeated targeted abuse or exclusionary behavior', 'Users', 'bg-red-500', 'high', TRUE, 2, 5),
('Harmful Behavior', 'harmful_behavior', 'Encouraging self-harm, violence, or illegal activities', 'TriangleAlert', 'bg-red-500', 'critical', TRUE, 1, 6),
('Misinformation', 'misinformation', 'Deliberately false or misleading information', 'Info', 'bg-yellow-500', 'medium', FALSE, 3, 7),
('Copyright Violation', 'copyright', 'Unauthorized sharing of copyrighted material', 'Copy', 'bg-blue-500', 'medium', FALSE, 3, 8),
('Impersonation', 'impersonation', 'Pretending to be someone else', 'UserX', 'bg-purple-500', 'high', TRUE, 2, 9),
('Other', 'other', 'Other violations not covered above', 'HelpCircle', 'bg-gray-500', 'low', FALSE, 5, 10);

-- Default Community Guidelines
INSERT INTO community_guidelines (version, title, content, is_active, effective_date) VALUES
('1.0', 'InnerLoop Community Guidelines', 
$guidelines$
# InnerLoop Community Guidelines

Welcome to the InnerLoop community! We are a diverse group of students committed to learning, growing, and supporting each other. These guidelines help ensure our community remains safe, welcoming, and productive for everyone.

## Our Core Values

1. **Respect** - Treat everyone with kindness and respect, regardless of background, experience level, or opinions.
2. **Inclusivity** - Welcome all students. Discrimination has no place here.
3. **Integrity** - Be honest about your progress, achievements, and challenges.
4. **Collaboration** - Share knowledge freely and help others learn.
5. **Growth Mindset** - Embrace challenges, learn from mistakes, and celebrate progress.

## Expected Behavior

### Do:
- Ask thoughtful questions and provide helpful answers
- Share your study journey, including struggles and successes
- Offer encouragement and constructive feedback
- Credit sources when sharing resources or ideas
- Use appropriate tags and categories for your posts
- Report content that violates these guidelines
- Protect your privacy and respect others' privacy

### Do Not:
- Harass, bully, or intimidate other members
- Share inappropriate, NSFW, or offensive content
- Spam the community with promotional content
- Share misleading information or fake achievements
- Impersonate other users or create fake accounts
- Share personal information (yours or others') without consent
- Engage in academic dishonesty (sharing exam answers, etc.)
- Use the community for commercial purposes without approval

## Content Standards

### Posts & Comments
- Keep discussions relevant to learning and productivity
- Use clear, descriptive titles
- Provide context when asking questions
- Mark solved questions with accepted answers
- Upvote helpful content, downvote unhelpful content

### Resources
- Only share resources you have permission to share
- Clearly indicate if content is your own or curated
- Include relevant tags and difficulty levels
- Report broken links or outdated resources

### Challenges & Accountability
- Join challenges with genuine intent to participate
- Be honest about your daily progress
- Support your partners, don't compete destructively
- Respect partners' privacy settings

## Safety & Privacy

- **Never share**: Passwords, addresses, phone numbers, school names, financial info
- **Control your visibility**: Use privacy settings to control what others see
- **Block & Report**: Use these tools if someone makes you uncomfortable
- **DMs are private**: But still subject to guidelines if reported

## Moderation

Our moderation team (including community moderators) may:
- Hide or remove content that violates guidelines
- Issue warnings for minor violations
- Temporarily suspend accounts for repeated violations
- Permanently ban accounts for severe violations
- Review appeals fairly and promptly

## Consequences

Violations may result in:
1. **Warning** - First minor offense, educational
2. **Content Removal** - Violating content hidden/removed
3. **Temporary Suspension** - 1-30 days based on severity
4. **Permanent Ban** - Severe or repeated violations
5. **Feature Restrictions** - Limited posting, messaging, etc.

## Appeals

If you believe a moderation action was incorrect:
1. Use the appeal option in the notification
2. Provide context and explanation
3. A different moderator will review within 48 hours

## Updates

These guidelines may be updated. Significant changes will be announced. Continued use implies acceptance.

## Questions?

Contact moderators via the "Report" feature or email community@innerloop.app

---

*Last updated: 2024. Version 1.0*
$guidelines$,
TRUE, NOW());

-- Default Content Filter Rules
INSERT INTO content_filter_rules (name, description, rule_type, pattern, categories, action, severity, applies_to, is_active, test_mode) VALUES
('Excessive Links', 'Detect posts with too many external links', 'keyword', 'http', ARRAY['post', 'comment', 'resource'], 'flag', 'medium', 'all', TRUE, FALSE),
('Phone Number Pattern', 'Detect potential phone numbers', 'regex', '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b', ARRAY['post', 'comment', 'direct_message', 'bio'], 'flag', 'high', 'all', TRUE, FALSE),
('Email Pattern', 'Detect potential email addresses', 'regex', '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', ARRAY['post', 'comment', 'direct_message', 'bio'], 'flag', 'high', 'all', TRUE, FALSE),
('Credit Card Pattern', 'Detect potential credit card numbers', 'regex', '\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b', ARRAY['post', 'comment', 'direct_message'], 'block', 'critical', 'all', TRUE, FALSE),
('SSN Pattern', 'Detect potential SSN', 'regex', '\\b\\d{3}-\\d{2}-\\d{4}\\b', ARRAY['post', 'comment', 'direct_message'], 'block', 'critical', 'all', TRUE, FALSE),
('Promotional Keywords', 'Detect promotional spam keywords', 'keyword', 'buy now,click here,limited offer,act fast,guaranteed,make money,work from home', ARRAY['post', 'comment', 'resource'], 'flag', 'medium', 'all', TRUE, FALSE),
('Duplicate Content', 'Detect potential duplicate posts', 'ml_model', 'duplicate_detection_v1', ARRAY['post', 'comment'], 'flag', 'medium', 'all', TRUE, TRUE);