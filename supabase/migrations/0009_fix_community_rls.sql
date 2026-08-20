-- ============================================================
-- MIGRATION 0009: Fix RLS Infinite Recursion in community_members
-- ============================================================
-- This migration fixes the infinite recursion (42P17) error by:
-- 1. Creating a SECURITY DEFINER helper function to check membership
-- 2. Replacing recursive policies with non-recursive ones using the helper
-- 3. Using auth.uid() and direct row checks where possible

-- ============================================================
-- HELPER FUNCTION: Safe community membership check
-- ============================================================
-- This function uses SECURITY DEFINER to bypass RLS and safely check
-- if a user is a member of a community without triggering recursive policies.

CREATE OR REPLACE FUNCTION is_community_member(p_community_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct table scan without RLS (SECURITY DEFINER bypasses RLS)
    RETURN EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id = p_community_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_community_member(UUID, UUID) TO authenticated;

-- ============================================================
-- HELPER FUNCTION: Safe community role check
-- ============================================================
-- Check if user has a specific role in a community

CREATE OR REPLACE FUNCTION get_community_role(p_community_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.community_members
    WHERE community_id = p_community_id
    AND user_id = p_user_id;
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_community_role(UUID, UUID) TO authenticated;

-- ============================================================
-- HELPER FUNCTION: Check if user is community owner/admin/moderator
-- ============================================================

CREATE OR REPLACE FUNCTION is_community_admin(p_community_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id = p_community_id
        AND user_id = p_user_id
        AND role IN ('owner', 'admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_community_admin(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION is_community_owner(p_community_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id = p_community_id
        AND user_id = p_user_id
        AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_community_owner(UUID, UUID) TO authenticated;

-- ============================================================
-- DROP AND RECREATE COMMUNITY_MEMBERS POLICIES (non-recursive)
-- ============================================================

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Community Members: Users can join" ON public.community_members;
DROP POLICY IF EXISTS "Community Members: Read own memberships" ON public.community_members;
DROP POLICY IF EXISTS "Community Members: Update own" ON public.community_members;
DROP POLICY IF EXISTS "Community Members: Delete own or admin remove" ON public.community_members;

-- Policy: Users can join public communities or request to join private ones
-- Uses direct check on communities table (not community_members) to avoid recursion
CREATE POLICY "Community Members: Users can join" ON public.community_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM public.communities
                WHERE id = community_id
                AND (visibility = 'public' OR require_approval = FALSE)
            )
            OR EXISTS (
                SELECT 1 FROM public.communities
                WHERE id = community_id
                AND created_by_id = auth.uid()
            )
        )
        OR is_admin()
    );

-- Policy: Users can read memberships for communities they belong to
-- Uses the SECURITY DEFINER helper function to avoid recursion
CREATE POLICY "Community Members: Read own memberships" ON public.community_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR is_community_member(community_id)
        OR EXISTS (
            SELECT 1 FROM public.communities
            WHERE id = community_id
            AND created_by_id = auth.uid()
        )
        OR is_admin()
    );

-- Policy: Users can update their own membership (notification prefs, etc.)
CREATE POLICY "Community Members: Update own" ON public.community_members
    FOR UPDATE USING (
        user_id = auth.uid()
        OR is_admin()
    );

-- Policy: Users can leave communities; owners/admins can remove members
-- Uses helper functions to avoid recursion
CREATE POLICY "Community Members: Delete own or admin remove" ON public.community_members
    FOR DELETE USING (
        user_id = auth.uid()
        OR is_community_admin(community_id)
        OR EXISTS (
            SELECT 1 FROM public.communities
            WHERE id = community_id
            AND created_by_id = auth.uid()
        )
        OR is_admin()
    );

-- ============================================================
-- UPDATE COMMUNITIES POLICIES to use helper functions
-- ============================================================

DROP POLICY IF EXISTS "Communities: Read access" ON public.communities;
DROP POLICY IF EXISTS "Communities: Update by owner/admin" ON public.communities;
DROP POLICY IF EXISTS "Communities: Delete by owner" ON public.communities;

-- Read access: Public communities visible to all; private only to members
CREATE POLICY "Communities: Read access" ON public.communities
    FOR SELECT USING (
        visibility = 'public'
        OR created_by_id = auth.uid()
        OR is_community_member(id)
        OR is_admin()
    );

-- Update by owner or community admins
CREATE POLICY "Communities: Update by owner/admin" ON public.communities
    FOR UPDATE USING (
        created_by_id = auth.uid()
        OR is_community_admin(id)
        OR is_admin()
    );

-- Delete by owner only
CREATE POLICY "Communities: Delete by owner" ON public.communities
    FOR DELETE USING (
        created_by_id = auth.uid()
        OR is_admin()
    );

-- ============================================================
-- UPDATE POSTS POLICIES to use helper functions
-- ============================================================

DROP POLICY IF EXISTS "Posts: Users can create" ON public.posts;
DROP POLICY IF EXISTS "Posts: Read access" ON public.posts;
DROP POLICY IF EXISTS "Posts: Update own or admin" ON public.posts;
DROP POLICY IF EXISTS "Posts: Delete own or admin" ON public.posts;

-- Create posts: Must be member of community (or public post)
CREATE POLICY "Posts: Users can create" ON public.posts
    FOR INSERT WITH CHECK (
        created_by_id = auth.uid()
        AND (
            community_id IS NULL
            OR is_community_member(community_id)
        )
        OR is_admin()
    );

-- Read access: Public posts, own posts, community posts for members
CREATE POLICY "Posts: Read access" ON public.posts
    FOR SELECT USING (
        is_hidden = FALSE
        AND (
            visibility = 'public'
            OR created_by_id = auth.uid()
            OR (community_id IS NOT NULL AND is_community_member(community_id))
            OR is_admin()
        )
    );

-- Update: Own posts, or community admins/moderators
CREATE POLICY "Posts: Update own or admin" ON public.posts
    FOR UPDATE USING (
        created_by_id = auth.uid()
        OR (community_id IS NOT NULL AND is_community_admin(community_id))
        OR is_admin()
    );

-- Delete: Own posts, or community admins/moderators
CREATE POLICY "Posts: Delete own or admin" ON public.posts
    FOR DELETE USING (
        created_by_id = auth.uid()
        OR (community_id IS NOT NULL AND is_community_admin(community_id))
        OR is_admin()
    );

-- ============================================================
-- UPDATE COMMENTS POLICIES to use helper functions
-- ============================================================

DROP POLICY IF EXISTS "Comments: Users can create" ON public.comments;
DROP POLICY IF EXISTS "Comments: Read on readable posts" ON public.comments;
DROP POLICY IF EXISTS "Comments: Update own or moderate" ON public.comments;
DROP POLICY IF EXISTS "Comments: Delete own or moderate" ON public.comments;

CREATE POLICY "Comments: Users can create" ON public.comments
    FOR INSERT WITH CHECK (
        created_by_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = comments.post_id
            AND (
                p.visibility = 'public'
                OR p.created_by_id = auth.uid()
                OR (p.community_id IS NOT NULL AND is_community_member(p.community_id))
            )
        )
        OR is_admin()
    );

CREATE POLICY "Comments: Read on readable posts" ON public.comments
    FOR SELECT USING (
        is_hidden = FALSE
        AND EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = comments.post_id
            AND (
                p.visibility = 'public'
                OR p.created_by_id = auth.uid()
                OR (p.community_id IS NOT NULL AND is_community_member(p.community_id))
            )
        )
        OR is_admin()
    );

CREATE POLICY "Comments: Update own or moderate" ON public.comments
    FOR UPDATE USING (
        created_by_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = comments.post_id
            AND (p.created_by_id = auth.uid() OR is_community_admin(p.community_id))
        )
        OR is_admin()
    );

CREATE POLICY "Comments: Delete own or moderate" ON public.comments
    FOR DELETE USING (
        created_by_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = comments.post_id
            AND (p.created_by_id = auth.uid() OR is_community_admin(p.community_id))
        )
        OR is_admin()
    );

-- ============================================================
-- UPDATE POST_REACTIONS POLICIES to use helper functions
-- ============================================================

DROP POLICY IF EXISTS "Post Reactions: Read on readable posts" ON public.post_reactions;

CREATE POLICY "Post Reactions: Read on readable posts" ON public.post_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_reactions.post_id
            AND (
                p.visibility = 'public'
                OR p.created_by_id = auth.uid()
                OR (p.community_id IS NOT NULL AND is_community_member(p.community_id))
            )
        )
        OR is_admin()
    );

-- ============================================================
-- UPDATE COMMENT_REACTIONS POLICIES to use helper functions
-- ============================================================

DROP POLICY IF EXISTS "Comment Reactions: Read on readable comments" ON public.comment_reactions;

CREATE POLICY "Comment Reactions: Read on readable comments" ON public.comment_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.comments c
            JOIN public.posts p ON p.id = c.post_id
            WHERE c.id = comment_reactions.comment_id
            AND (
                p.visibility = 'public'
                OR p.created_by_id = auth.uid()
                OR (p.community_id IS NOT NULL AND is_community_member(p.community_id))
            )
        )
        OR is_admin()
    );

-- ============================================================
-- UPDATE REPORTS POLICIES to use helper functions
-- ============================================================

DROP POLICY IF EXISTS "Reports: Read own or admin" ON public.reports;

CREATE POLICY "Reports: Read own or admin" ON public.reports
    FOR SELECT USING (
        reporter_id = auth.uid()
        OR is_admin()
        OR EXISTS (
            SELECT 1 FROM public.community_members cm
            JOIN public.communities c ON c.id = cm.community_id
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'moderator')
            AND (
                (reports.reported_content_type = 'post' AND EXISTS (
                    SELECT 1 FROM public.posts p WHERE p.id = reports.reported_content_id AND p.community_id = c.id
                ))
                OR (reports.reported_content_type = 'comment' AND EXISTS (
                    SELECT 1 FROM public.comments co
                    JOIN public.posts p ON p.id = co.post_id
                    WHERE co.id = reports.reported_content_id AND p.community_id = c.id
                ))
                OR (reports.reported_content_type = 'community' AND reports.reported_content_id = c.id)
            )
        )
    );

-- ============================================================
-- UPDATE CHALLENGES POLICIES (from migration 0006) to use helper
-- ============================================================

DROP POLICY IF EXISTS "Challenges: Read public" ON public.challenges;

CREATE POLICY "Challenges: Read public" ON public.challenges
    FOR SELECT USING (
        visibility = 'public'
        OR created_by_id = auth.uid()
        OR (visibility = 'community' AND community_id IS NOT NULL AND is_community_member(community_id))
        OR EXISTS (
            SELECT 1 FROM public.challenge_participants
            WHERE challenge_id = challenges.id AND user_id = auth.uid()
        )
        OR is_admin()
    );

DROP POLICY IF EXISTS "Challenge Participants: Users can join" ON public.challenge_participants;

CREATE POLICY "Challenge Participants: Users can join" ON public.challenge_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_id
            AND c.status IN ('upcoming', 'active')
            AND (c.allow_late_join = TRUE OR c.start_date >= CURRENT_DATE)
            AND (c.max_participants IS NULL OR (
                SELECT COUNT(*) FROM public.challenge_participants WHERE challenge_id = c.id
            ) < c.max_participants)
            AND (
                c.visibility = 'public'
                OR c.created_by_id = auth.uid()
                OR (c.visibility = 'community' AND is_community_member(c.community_id))
            )
        )
        OR is_admin()
    );

DROP POLICY IF EXISTS "Challenge Participants: Read own or challenge participants" ON public.challenge_participants;

CREATE POLICY "Challenge Participants: Read own or challenge participants" ON public.challenge_participants
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.challenge_participants cp2
            WHERE cp2.challenge_id = challenge_participants.challenge_id
            AND cp2.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_participants.challenge_id
            AND (c.created_by_id = auth.uid() OR c.visibility = 'public')
        )
        OR is_admin()
    );

-- ============================================================
-- UPDATE RESOURCES POLICIES (from migration 0007) to use helper
-- ============================================================

DROP POLICY IF EXISTS "Resources: Read public" ON public.resources;

CREATE POLICY "Resources: Read public" ON public.resources
    FOR SELECT USING (
        is_hidden = FALSE
        AND (
            visibility = 'public'
            OR created_by_id = auth.uid()
            OR (visibility = 'community' AND community_id IS NOT NULL AND is_community_member(community_id))
        )
        OR is_admin()
    );

DROP POLICY IF EXISTS "Resource Comments: Users can comment" ON public.resource_comments;

CREATE POLICY "Resource Comments: Users can comment" ON public.resource_comments
    FOR INSERT WITH CHECK (
        created_by_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.resources r
            WHERE r.id = resource_comments.resource_id
            AND (r.visibility = 'public' OR r.created_by_id = auth.uid() OR (r.visibility = 'community' AND is_community_member(r.community_id)))
        )
        OR is_admin()
    );

DROP POLICY IF EXISTS "Resource Comments: Read on readable resources" ON public.resource_comments;

CREATE POLICY "Resource Comments: Read on readable resources" ON public.resource_comments
    FOR SELECT USING (
        is_hidden = FALSE
        AND EXISTS (
            SELECT 1 FROM public.resources r
            WHERE r.id = resource_comments.resource_id
            AND (r.visibility = 'public' OR r.created_by_id = auth.uid() OR (r.visibility = 'community' AND is_community_member(r.community_id)))
        )
        OR is_admin()
    );

-- ============================================================
-- UPDATE MODERATION QUEUE POLICIES (from migration 0008) to use helper
-- ============================================================

DROP POLICY IF EXISTS "Moderation Queue: Moderators can read" ON public.moderation_queue;

CREATE POLICY "Moderation Queue: Moderators can read" ON public.moderation_queue
    FOR SELECT USING (
        is_admin()
        OR assigned_moderator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.community_members cm
            JOIN public.communities c ON c.id = cm.community_id
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'moderator')
            AND (
                (moderation_queue.reported_content_type = 'post' AND EXISTS (
                    SELECT 1 FROM public.posts p WHERE p.id = moderation_queue.reported_content_id AND p.community_id = c.id
                ))
                OR (moderation_queue.reported_content_type = 'comment' AND EXISTS (
                    SELECT 1 FROM public.comments co
                    JOIN public.posts p ON p.id = co.post_id
                    WHERE co.id = moderation_queue.reported_content_id AND p.community_id = c.id
                ))
                OR (moderation_queue.reported_content_type = 'resource' AND EXISTS (
                    SELECT 1 FROM public.resources r WHERE r.id = moderation_queue.reported_content_id AND r.community_id = c.id
                ))
            )
        )
    );

DROP POLICY IF EXISTS "Moderation Queue: Moderators can update" ON public.moderation_queue;

CREATE POLICY "Moderation Queue: Moderators can update" ON public.moderation_queue
    FOR UPDATE USING (
        is_admin()
        OR assigned_moderator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.community_members cm
            JOIN public.communities c ON c.id = cm.community_id
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- ============================================================
-- UPDATE USER WARNINGS/SANCTIONS POLICIES (from migration 0008) to use helper
-- ============================================================

DROP POLICY IF EXISTS "User Warnings: Read own" ON public.user_warnings;

CREATE POLICY "User Warnings: Read own" ON public.user_warnings
    FOR SELECT USING (
        user_id = auth.uid()
        OR is_admin()
        OR EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "User Warnings: Moderators can create" ON public.user_warnings;

CREATE POLICY "User Warnings: Moderators can create" ON public.user_warnings
    FOR INSERT WITH CHECK (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "User Warnings: Moderators can update" ON public.user_warnings;

CREATE POLICY "User Warnings: Moderators can update" ON public.user_warnings
    FOR UPDATE USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "User Sanctions: Read own" ON public.user_sanctions;

CREATE POLICY "User Sanctions: Read own" ON public.user_sanctions
    FOR SELECT USING (
        user_id = auth.uid()
        OR is_admin()
        OR EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "User Sanctions: Moderators can manage" ON public.user_sanctions;

CREATE POLICY "User Sanctions: Moderators can manage" ON public.user_sanctions
    FOR ALL USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- ============================================================
-- NOTIFY PGRST TO RELOAD SCHEMA
-- ============================================================
NOTIFY pgrst, 'reload schema';