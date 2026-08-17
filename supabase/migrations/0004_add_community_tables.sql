-- InnerLoop Community Feature Migration
-- Phase 1: Community Profiles, Communities, Community Members
-- Phase 2: Posts, Comments, Post Reactions
-- Phase 3: Direct Messages
-- Phase 4: Reports, Blocks, Notifications

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE post_type AS ENUM ('question', 'discussion', 'study_tip', 'resource', 'achievement');
CREATE TYPE post_visibility AS ENUM ('public', 'community', 'followers');
CREATE TYPE community_visibility AS ENUM ('public', 'private');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'system');
CREATE TYPE report_reason AS ENUM ('harassment', 'spam', 'inappropriate_content', 'scam', 'bullying', 'harmful_behavior', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- ============================================================
-- TABLES
-- ============================================================

-- Community Profiles (extends user with public community info)
CREATE TABLE community_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    username TEXT UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    subjects TEXT[],
    interests TEXT[],
    skills TEXT[],
    learning_goals TEXT[],
    -- Privacy settings
    show_email BOOLEAN NOT NULL DEFAULT FALSE,
    show_profile_to_public BOOLEAN NOT NULL DEFAULT TRUE,
    show_subjects BOOLEAN NOT NULL DEFAULT TRUE,
    show_interests BOOLEAN NOT NULL DEFAULT TRUE,
    show_skills BOOLEAN NOT NULL DEFAULT TRUE,
    show_learning_goals BOOLEAN NOT NULL DEFAULT TRUE,
    allow_direct_messages BOOLEAN NOT NULL DEFAULT TRUE,
    allow_community_invites BOOLEAN NOT NULL DEFAULT TRUE,
    -- Stats (computed/cached)
    posts_count INTEGER NOT NULL DEFAULT 0,
    replies_count INTEGER NOT NULL DEFAULT 0,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ
);

-- Communities (study groups, subject communities, interest groups)
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    banner_url TEXT,
    visibility community_visibility NOT NULL DEFAULT 'public',
    -- Settings
    allow_posts BOOLEAN NOT NULL DEFAULT TRUE,
    allow_member_invites BOOLEAN NOT NULL DEFAULT TRUE,
    require_approval BOOLEAN NOT NULL DEFAULT FALSE,
    -- Stats (computed/cached)
    members_count INTEGER NOT NULL DEFAULT 0,
    posts_count INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE
);

-- Community Members (many-to-many between users and communities)
CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'moderator', 'member'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Notification preferences for this community
    notify_new_posts BOOLEAN NOT NULL DEFAULT TRUE,
    notify_mentions BOOLEAN NOT NULL DEFAULT TRUE,
    notify_replies BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(community_id, user_id)
);

-- Posts (discussions, questions, tips, resources, achievements)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
    type post_type NOT NULL DEFAULT 'discussion',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    visibility post_visibility NOT NULL DEFAULT 'public',
    -- Tags for discovery
    tags TEXT[],
    -- Moderation
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_reason TEXT,
    hidden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hidden_at TIMESTAMPTZ,
    -- Stats (computed/cached)
    likes_count INTEGER NOT NULL DEFAULT 0,
    replies_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,
    saves_count INTEGER NOT NULL DEFAULT 0,
    -- For achievements
    related_focus_session_id UUID REFERENCES focus_sessions(id) ON DELETE SET NULL
);

-- Comments/Replies on posts
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For nested replies
    content TEXT NOT NULL,
    -- Moderation
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_reason TEXT,
    hidden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hidden_at TIMESTAMPTZ,
    -- Stats
    likes_count INTEGER NOT NULL DEFAULT 0,
    is_solution BOOLEAN NOT NULL DEFAULT FALSE -- For questions: marks accepted answer
);

-- Post Reactions (likes, upvotes, etc.)
CREATE TABLE post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like', -- 'like', 'helpful', 'insightful', 'thanks'
    UNIQUE(user_id, post_id, reaction_type)
);

-- Comment Reactions
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like',
    UNIQUE(user_id, comment_id, reaction_type)
);

-- Saved Posts (bookmarks)
CREATE TABLE saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(user_id, post_id)
);

-- Direct Messages (one-to-one conversations)
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type message_type NOT NULL DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    -- Status
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    -- Soft delete (hidden from sender or recipient)
    deleted_by_sender BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_by_recipient BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

-- Reports (moderation)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Polymorphic reference to reported content
    reported_content_type TEXT NOT NULL, -- 'post', 'comment', 'direct_message', 'community_profile', 'community'
    reported_content_id UUID NOT NULL,
    reason report_reason NOT NULL,
    description TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT
);

-- Blocks (user safety)
CREATE TABLE user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    UNIQUE(blocker_id, blocked_id)
);

-- Community Notifications (extend existing notification system)
-- We'll use the existing notifications table with community-specific types
-- Adding community-related notification types via the existing notification_type enum

-- ============================================================
-- INDEXES
-- ============================================================

-- Community Profiles
CREATE INDEX idx_community_profiles_user_id ON community_profiles(user_id);
CREATE INDEX idx_community_profiles_username ON community_profiles(username);
CREATE INDEX idx_community_profiles_subjects ON community_profiles USING GIN(subjects);
CREATE INDEX idx_community_profiles_interests ON community_profiles USING GIN(interests);
CREATE INDEX idx_community_profiles_skills ON community_profiles USING GIN(skills);
CREATE INDEX idx_community_profiles_last_active ON community_profiles(last_active_at DESC);

-- Communities
CREATE INDEX idx_communities_created_by_id ON communities(created_by_id);
CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_visibility ON communities(visibility);
CREATE INDEX idx_communities_is_featured ON communities(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_communities_members_count ON communities(members_count DESC);

-- Community Members
CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_community_members_user_id ON community_members(user_id);
CREATE INDEX idx_community_members_role ON community_members(community_id, role);

-- Posts
CREATE INDEX idx_posts_created_by_id ON posts(created_by_id);
CREATE INDEX idx_posts_community_id ON posts(community_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_created_at ON posts(created_by_id, created_at DESC);
CREATE INDEX idx_posts_community_created ON posts(community_id, created_at DESC);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX idx_posts_is_pinned ON posts(community_id, is_pinned DESC, created_at DESC) WHERE is_pinned = TRUE;

-- Comments
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_created_by_id ON comments(created_by_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at ASC);

-- Post Reactions
CREATE INDEX idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON post_reactions(user_id);

-- Comment Reactions
CREATE INDEX idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user_id ON comment_reactions(user_id);

-- Saved Posts
CREATE INDEX idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX idx_saved_posts_post_id ON saved_posts(post_id);

-- Direct Messages
CREATE INDEX idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX idx_direct_messages_recipient_id ON direct_messages(recipient_id);
CREATE INDEX idx_direct_messages_conversation ON direct_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_direct_messages_unread ON direct_messages(recipient_id, is_read, created_at DESC) WHERE is_read = FALSE AND deleted_by_recipient = FALSE;

-- Reports
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_reported_content ON reports(reported_content_type, reported_content_id);
CREATE INDEX idx_reports_status ON reports(status);

-- User Blocks
CREATE INDEX idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked_id ON user_blocks(blocked_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMMUNITY PROFILES POLICIES
-- ============================================================

-- Users can create their own profile
CREATE POLICY "Community Profiles: Users can create their own" ON community_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

-- Users can read public profiles, or their own private profile
CREATE POLICY "Community Profiles: Users can read public profiles" ON community_profiles
    FOR SELECT USING (
        show_profile_to_public = TRUE 
        OR user_id = auth.uid() 
        OR is_admin()
    );

-- Users can update their own profile
CREATE POLICY "Community Profiles: Users can update their own" ON community_profiles
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- Users can delete their own profile
CREATE POLICY "Community Profiles: Users can delete their own" ON community_profiles
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- COMMUNITIES POLICIES
-- ============================================================

-- Authenticated users can create communities
CREATE POLICY "Communities: Users can create" ON communities
    FOR INSERT WITH CHECK (created_by_id = auth.uid() OR is_admin());

-- Public communities are readable by all authenticated users
-- Private communities only readable by members
CREATE POLICY "Communities: Read access" ON communities
    FOR SELECT USING (
        visibility = 'public'
        OR created_by_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = communities.id AND user_id = auth.uid()
        )
        OR is_admin()
    );

-- Owners and admins can update
CREATE POLICY "Communities: Update by owner/admin" ON communities
    FOR UPDATE USING (
        created_by_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = communities.id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        OR is_admin()
    );

-- Owners can delete
CREATE POLICY "Communities: Delete by owner" ON communities
    FOR DELETE USING (
        created_by_id = auth.uid() 
        OR is_admin()
    );

-- ============================================================
-- COMMUNITY MEMBERS POLICIES
-- ============================================================

-- Users can join public communities, or request to join private ones
CREATE POLICY "Community Members: Users can join" ON community_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        AND (
            EXISTS (
                SELECT 1 FROM communities 
                WHERE id = community_id 
                AND (visibility = 'public' OR require_approval = FALSE)
            )
            OR EXISTS (
                SELECT 1 FROM communities 
                WHERE id = community_id 
                AND created_by_id = auth.uid()
            )
        )
        OR is_admin()
    );

-- Members can read member list of communities they belong to
CREATE POLICY "Community Members: Read own memberships" ON community_members
    FOR SELECT USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM community_members cm2 
            WHERE cm2.community_id = community_members.community_id 
            AND cm2.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_id 
            AND created_by_id = auth.uid()
        )
        OR is_admin()
    );

-- Users can update their own membership (e.g., notification prefs)
CREATE POLICY "Community Members: Update own" ON community_members
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- Users can leave communities (delete own membership)
-- Owners/admins can remove members
CREATE POLICY "Community Members: Delete own or admin remove" ON community_members
    FOR DELETE USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM community_members cm2 
            WHERE cm2.community_id = community_members.community_id 
            AND cm2.user_id = auth.uid() 
            AND cm2.role IN ('owner', 'admin')
        )
        OR EXISTS (
            SELECT 1 FROM communities 
            WHERE id = community_id 
            AND created_by_id = auth.uid()
        )
        OR is_admin()
    );

-- ============================================================
-- POSTS POLICIES
-- ============================================================

-- Authenticated users can create posts in communities they're members of, or public posts
CREATE POLICY "Posts: Users can create" ON posts
    FOR INSERT WITH CHECK (
        created_by_id = auth.uid() 
        AND (
            community_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM community_members 
                WHERE community_id = posts.community_id 
                AND user_id = auth.uid()
            )
        )
        OR is_admin()
    );

-- Read access: 
-- - Public posts visible to all
-- - Community posts visible to members
-- - Own posts always visible
CREATE POLICY "Posts: Read access" ON posts
    FOR SELECT USING (
        is_hidden = FALSE
        AND (
            visibility = 'public'
            OR created_by_id = auth.uid()
            OR (community_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM community_members 
                WHERE community_id = posts.community_id 
                AND user_id = auth.uid()
            ))
            OR is_admin()
        )
    );

-- Users can update their own posts
-- Community admins can update any post in their community
CREATE POLICY "Posts: Update own or admin" ON posts
    FOR UPDATE USING (
        created_by_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = posts.community_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'moderator')
        )
        OR is_admin()
    );

-- Users can delete their own posts
-- Community admins can delete any post in their community
CREATE POLICY "Posts: Delete own or admin" ON posts
    FOR DELETE USING (
        created_by_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = posts.community_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'moderator')
        )
        OR is_admin()
    );

-- ============================================================
-- COMMENTS POLICIES
-- ============================================================

-- Users can comment on posts they can read
CREATE POLICY "Comments: Users can create" ON comments
    FOR INSERT WITH CHECK (
        created_by_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM posts 
            WHERE id = comments.post_id 
            AND (
                visibility = 'public'
                OR created_by_id = auth.uid()
                OR (community_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM community_members 
                    WHERE community_id = posts.community_id 
                    AND user_id = auth.uid()
                ))
            )
        )
        OR is_admin()
    );

-- Read comments on readable posts
CREATE POLICY "Comments: Read on readable posts" ON comments
    FOR SELECT USING (
        is_hidden = FALSE
        AND EXISTS (
            SELECT 1 FROM posts 
            WHERE id = comments.post_id 
            AND (
                visibility = 'public'
                OR created_by_id = auth.uid()
                OR (community_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM community_members 
                    WHERE community_id = posts.community_id 
                    AND user_id = auth.uid()
                ))
            )
        )
        OR is_admin()
    );

-- Users can update their own comments
-- Post author and community moderators can hide comments
CREATE POLICY "Comments: Update own or moderate" ON comments
    FOR UPDATE USING (
        created_by_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM posts p
            JOIN community_members cm ON cm.community_id = p.community_id
            WHERE p.id = comments.post_id 
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
        OR EXISTS (
            SELECT 1 FROM posts WHERE id = comments.post_id AND created_by_id = auth.uid()
        )
        OR is_admin()
    );

-- Users can delete their own comments
-- Post author and community moderators can delete
CREATE POLICY "Comments: Delete own or moderate" ON comments
    FOR DELETE USING (
        created_by_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM posts p
            JOIN community_members cm ON cm.community_id = p.community_id
            WHERE p.id = comments.post_id 
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
        OR EXISTS (
            SELECT 1 FROM posts WHERE id = comments.post_id AND created_by_id = auth.uid()
        )
        OR is_admin()
    );

-- ============================================================
-- POST REACTIONS POLICIES
-- ============================================================

CREATE POLICY "Post Reactions: Users can create" ON post_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Post Reactions: Read on readable posts" ON post_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE id = post_reactions.post_id 
            AND (
                visibility = 'public'
                OR created_by_id = auth.uid()
                OR (community_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM community_members 
                    WHERE community_id = posts.community_id 
                    AND user_id = auth.uid()
                ))
            )
        )
        OR is_admin()
    );

CREATE POLICY "Post Reactions: Users can delete own" ON post_reactions
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- COMMENT REACTIONS POLICIES
-- ============================================================

CREATE POLICY "Comment Reactions: Users can create" ON comment_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Comment Reactions: Read on readable comments" ON comment_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM comments c
            JOIN posts p ON p.id = c.post_id
            WHERE c.id = comment_reactions.comment_id 
            AND (
                p.visibility = 'public'
                OR p.created_by_id = auth.uid()
                OR (p.community_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM community_members 
                    WHERE community_id = p.community_id 
                    AND user_id = auth.uid()
                ))
            )
        )
        OR is_admin()
    );

CREATE POLICY "Comment Reactions: Users can delete own" ON comment_reactions
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- SAVED POSTS POLICIES
-- ============================================================

CREATE POLICY "Saved Posts: Users can create" ON saved_posts
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Saved Posts: Users can read own" ON saved_posts
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Saved Posts: Users can delete own" ON saved_posts
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- DIRECT MESSAGES POLICIES
-- ============================================================

-- Users can send messages to users who allow DMs and haven't blocked them
CREATE POLICY "Direct Messages: Send" ON direct_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() 
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks 
            WHERE blocker_id = recipient_id AND blocked_id = sender_id
        )
        AND (
            SELECT allow_direct_messages FROM community_profiles 
            WHERE user_id = recipient_id
        ) IS NOT FALSE
        OR is_admin()
    );

-- Users can read messages they sent or received (if not deleted)
CREATE POLICY "Direct Messages: Read own" ON direct_messages
    FOR SELECT USING (
        (sender_id = auth.uid() AND deleted_by_sender = FALSE)
        OR (recipient_id = auth.uid() AND deleted_by_recipient = FALSE)
        OR is_admin()
    );

-- Users can update their own messages (mark read, soft delete)
CREATE POLICY "Direct Messages: Update own" ON direct_messages
    FOR UPDATE USING (
        (sender_id = auth.uid() OR recipient_id = auth.uid())
        OR is_admin()
    );

-- Users can delete their own sent messages (soft delete)
-- Recipients can delete received messages (soft delete)
CREATE POLICY "Direct Messages: Soft delete" ON direct_messages
    FOR DELETE USING (
        (sender_id = auth.uid() OR recipient_id = auth.uid())
        OR is_admin()
    );

-- ============================================================
-- REPORTS POLICIES
-- ============================================================

-- Users can create reports
CREATE POLICY "Reports: Users can create" ON reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid() OR is_admin());

-- Users can read their own reports
-- Admins/mods can read all reports
CREATE POLICY "Reports: Read own or admin" ON reports
    FOR SELECT USING (
        reporter_id = auth.uid() 
        OR is_admin()
        OR EXISTS (
            SELECT 1 FROM community_members cm
            JOIN communities c ON c.id = cm.community_id
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin', 'moderator')
            AND (
                (reports.reported_content_type = 'post' AND EXISTS (
                    SELECT 1 FROM posts p WHERE p.id = reports.reported_content_id AND p.community_id = c.id
                ))
                OR (reports.reported_content_type = 'comment' AND EXISTS (
                    SELECT 1 FROM comments co
                    JOIN posts p ON p.id = co.post_id
                    WHERE co.id = reports.reported_content_id AND p.community_id = c.id
                ))
                OR (reports.reported_content_type = 'community' AND reports.reported_content_id = c.id)
            )
        )
    );

-- Admins can update reports
CREATE POLICY "Reports: Admin can update" ON reports
    FOR UPDATE USING (is_admin() OR (
        EXISTS (
            SELECT 1 FROM community_members cm
            JOIN communities c ON c.id = cm.community_id
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    ));

-- ============================================================
-- USER BLOCKS POLICIES
-- ============================================================

CREATE POLICY "User Blocks: Users can create" ON user_blocks
    FOR INSERT WITH CHECK (blocker_id = auth.uid() OR is_admin());

CREATE POLICY "User Blocks: Users can read own" ON user_blocks
    FOR SELECT USING (blocker_id = auth.uid() OR is_admin());

CREATE POLICY "User Blocks: Users can delete own" ON user_blocks
    FOR DELETE USING (blocker_id = auth.uid() OR is_admin());

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE TRIGGER update_community_profiles_updated_at
    BEFORE UPDATE ON community_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at
    BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_members_updated_at
    BEFORE UPDATE ON community_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_direct_messages_updated_at
    BEFORE UPDATE ON direct_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GRANTS
-- ============================================================

GRANT USAGE ON TYPE post_type TO authenticated;
GRANT USAGE ON TYPE post_visibility TO authenticated;
GRANT USAGE ON TYPE community_visibility TO authenticated;
GRANT USAGE ON TYPE message_type TO authenticated;
GRANT USAGE ON TYPE report_reason TO authenticated;
GRANT USAGE ON TYPE report_status TO authenticated;

GRANT ALL ON community_profiles TO authenticated;
GRANT ALL ON communities TO authenticated;
GRANT ALL ON community_members TO authenticated;
GRANT ALL ON posts TO authenticated;
GRANT ALL ON comments TO authenticated;
GRANT ALL ON post_reactions TO authenticated;
GRANT ALL ON comment_reactions TO authenticated;
GRANT ALL ON saved_posts TO authenticated;
GRANT ALL ON direct_messages TO authenticated;
GRANT ALL ON reports TO authenticated;
GRANT ALL ON user_blocks TO authenticated;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE community_profiles IS 'Public community profile for each user (separate from private account data)';
COMMENT ON TABLE communities IS 'Study communities, interest groups, subject-based communities';
COMMENT ON TABLE community_members IS 'Membership linking users to communities with roles';
COMMENT ON TABLE posts IS 'Community posts: questions, discussions, study tips, resources, achievements';
COMMENT ON TABLE comments IS 'Replies/comments on posts, supports nested replies';
COMMENT ON TABLE post_reactions IS 'Reactions on posts (like, helpful, insightful, thanks)';
COMMENT ON TABLE comment_reactions IS 'Reactions on comments';
COMMENT ON TABLE saved_posts IS 'User bookmarks for posts';
COMMENT ON TABLE direct_messages IS 'Private one-to-one messages between users';
COMMENT ON TABLE reports IS 'Content reports for moderation';
COMMENT ON TABLE user_blocks IS 'User blocks for safety';

COMMENT ON COLUMN community_profiles.show_email IS 'Whether to show email publicly (default: false)';
COMMENT ON COLUMN community_profiles.allow_direct_messages IS 'Whether to allow DMs from other users';
COMMENT ON COLUMN communities.slug IS 'URL-friendly unique identifier for the community';
COMMENT ON COLUMN communities.visibility IS 'Public communities are discoverable; private require invite/approval';
COMMENT ON COLUMN posts.visibility IS 'Public: everyone; Community: members only; Followers: future use';
COMMENT ON COLUMN posts.type IS 'Type of post for filtering and display';
COMMENT ON COLUMN comments.is_solution IS 'For questions: marks this comment as the accepted answer';
COMMENT ON COLUMN direct_messages.deleted_by_sender IS 'Soft delete: hidden from sender only';
COMMENT ON COLUMN direct_messages.deleted_by_recipient IS 'Soft delete: hidden from recipient only';