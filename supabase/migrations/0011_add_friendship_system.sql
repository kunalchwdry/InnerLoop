-- ============================================================
-- MIGRATION 0011: Add Friendship System
-- ============================================================
-- Adds friend requests and friendships tables for the chat/friend system
-- Reuses existing community_profiles.username for unique identifiers
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- Friend Requests (pending, accepted, rejected, blocked)
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'blocked'
    CONSTRAINT no_self_friend_request CHECK (sender_id != receiver_id),
    CONSTRAINT unique_friend_request UNIQUE (sender_id, receiver_id)
);

-- Friendships (mutual relationship after acceptance)
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Friend Requests
CREATE INDEX idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);
CREATE INDEX idx_friend_requests_pending ON friend_requests(receiver_id, status) WHERE status = 'pending';

-- Friendships
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FRIEND REQUESTS POLICIES
-- ============================================================

-- Users can send friend requests
CREATE POLICY "Friend Requests: Users can create" ON friend_requests
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks 
            WHERE blocker_id = receiver_id AND blocked_id = sender_id
        )
        AND NOT EXISTS (
            SELECT 1 FROM friend_requests fr 
            WHERE (fr.sender_id = auth.uid() AND fr.receiver_id = friend_requests.receiver_id)
               OR (fr.receiver_id = auth.uid() AND fr.sender_id = friend_requests.receiver_id)
        )
        AND NOT EXISTS (
            SELECT 1 FROM friendships f 
            WHERE (f.user_id = auth.uid() AND f.friend_id = friend_requests.receiver_id)
               OR (f.friend_id = auth.uid() AND f.user_id = friend_requests.receiver_id)
        )
    );

-- Users can read friend requests they sent or received
CREATE POLICY "Friend Requests: Read own" ON friend_requests
    FOR SELECT USING (
        sender_id = auth.uid() 
        OR receiver_id = auth.uid()
    );

-- Users can update their own sent requests (cancel) or received requests (accept/reject)
CREATE POLICY "Friend Requests: Update own" ON friend_requests
    FOR UPDATE USING (
        sender_id = auth.uid() 
        OR receiver_id = auth.uid()
    );

-- Users can delete their own sent requests
CREATE POLICY "Friend Requests: Delete own" ON friend_requests
    FOR DELETE USING (
        sender_id = auth.uid() 
        OR receiver_id = auth.uid()
    );

-- ============================================================
-- FRIENDSHIPS POLICIES
-- ============================================================

-- System creates friendships (via trigger/function), users can read their own
CREATE POLICY "Friendships: Read own" ON friendships
    FOR SELECT USING (
        user_id = auth.uid() 
        OR friend_id = auth.uid()
    );

-- Users can delete their own friendships (unfriend)
CREATE POLICY "Friendships: Delete own" ON friendships
    FOR DELETE USING (
        user_id = auth.uid() 
        OR friend_id = auth.uid()
    );

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE TRIGGER update_friend_requests_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: Accept Friend Request
-- ============================================================
-- This function atomically accepts a friend request and creates the friendship

CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_sender_id UUID;
    v_receiver_id UUID;
BEGIN
    -- Get the request details
    SELECT sender_id, receiver_id 
    INTO v_sender_id, v_receiver_id
    FROM friend_requests
    WHERE id = p_request_id
    AND receiver_id = auth.uid()
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request not found or not authorized';
    END IF;
    
    -- Update request status
    UPDATE friend_requests 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = p_request_id;
    
    -- Create bidirectional friendship
    INSERT INTO friendships (user_id, friend_id) VALUES
        (v_sender_id, v_receiver_id),
        (v_receiver_id, v_sender_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_friend_request(UUID) TO authenticated;

-- ============================================================
-- FUNCTION: Reject Friend Request
-- ============================================================

CREATE OR REPLACE FUNCTION reject_friend_request(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE friend_requests 
    SET status = 'rejected', updated_at = NOW()
    WHERE id = p_request_id
    AND receiver_id = auth.uid()
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request not found or not authorized';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reject_friend_request(UUID) TO authenticated;

-- ============================================================
-- FUNCTION: Send Friend Request
-- ============================================================

CREATE OR REPLACE FUNCTION send_friend_request(p_receiver_username TEXT)
RETURNS UUID AS $$
DECLARE
    v_receiver_id UUID;
    v_request_id UUID;
BEGIN
    -- Find receiver by username from community_profiles
    SELECT user_id INTO v_receiver_id
    FROM community_profiles
    WHERE username = p_receiver_username;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF v_receiver_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot send friend request to yourself';
    END IF;
    
    -- Check if blocked
    IF EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE blocker_id = v_receiver_id AND blocked_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Cannot send friend request to this user';
    END IF;
    
    -- Check if already friends
    IF EXISTS (
        SELECT 1 FROM friendships 
        WHERE (user_id = auth.uid() AND friend_id = v_receiver_id)
           OR (user_id = v_receiver_id AND friend_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Already friends';
    END IF;
    
    -- Check if request already exists
    IF EXISTS (
        SELECT 1 FROM friend_requests 
        WHERE (sender_id = auth.uid() AND receiver_id = v_receiver_id)
           OR (sender_id = v_receiver_id AND receiver_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Friend request already exists';
    END IF;
    
    -- Create the request
    INSERT INTO friend_requests (sender_id, receiver_id, status)
    VALUES (auth.uid(), v_receiver_id, 'pending')
    RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_friend_request(TEXT) TO authenticated;

-- ============================================================
-- FUNCTION: Cancel Friend Request
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_friend_request(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM friend_requests 
    WHERE id = p_request_id
    AND sender_id = auth.uid()
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request not found or not authorized';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_friend_request(UUID) TO authenticated;

-- ============================================================
-- FUNCTION: Unfriend
-- ============================================================

CREATE OR REPLACE FUNCTION unfriend(p_friend_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM friendships 
    WHERE (user_id = auth.uid() AND friend_id = p_friend_id)
       OR (user_id = p_friend_id AND friend_id = auth.uid());
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friendship not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unfriend(UUID) TO authenticated;

-- ============================================================
-- FUNCTION: Search User by Username
-- ============================================================

CREATE OR REPLACE FUNCTION search_user_by_username(p_username TEXT)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    username TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_friend BOOLEAN,
    has_pending_request BOOLEAN,
    request_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.user_id,
        cp.display_name,
        cp.username,
        cp.avatar_url,
        cp.bio,
        EXISTS (
            SELECT 1 FROM friendships 
            WHERE (user_id = auth.uid() AND friend_id = cp.user_id)
               OR (user_id = cp.user_id AND friend_id = auth.uid())
        ) AS is_friend,
        EXISTS (
            SELECT 1 FROM friend_requests 
            WHERE (sender_id = auth.uid() AND receiver_id = cp.user_id AND status = 'pending')
               OR (sender_id = cp.user_id AND receiver_id = auth.uid() AND status = 'pending')
        ) AS has_pending_request,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM friend_requests 
                WHERE sender_id = auth.uid() AND receiver_id = cp.user_id AND status = 'pending'
            ) THEN 'sent'
            WHEN EXISTS (
                SELECT 1 FROM friend_requests 
                WHERE sender_id = cp.user_id AND receiver_id = auth.uid() AND status = 'pending'
            ) THEN 'received'
            ELSE NULL
        END AS request_status
    FROM community_profiles cp
    WHERE cp.username ILIKE p_username || '%'
    AND cp.show_profile_to_public = TRUE
    AND cp.user_id != auth.uid()
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_user_by_username(TEXT) TO authenticated;

-- ============================================================
-- FUNCTION: Get Friends List
-- ============================================================

CREATE OR REPLACE FUNCTION get_friends()
RETURNS TABLE (
    friend_id UUID,
    display_name TEXT,
    username TEXT,
    avatar_url TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.friend_id,
        cp.display_name,
        cp.username,
        cp.avatar_url,
        (
            SELECT MAX(created_at) FROM direct_messages
            WHERE (sender_id = auth.uid() AND recipient_id = f.friend_id)
               OR (sender_id = f.friend_id AND recipient_id = auth.uid())
        ) AS last_message_at,
        (
            SELECT COUNT(*) FROM direct_messages
            WHERE sender_id = f.friend_id 
            AND recipient_id = auth.uid()
            AND is_read = FALSE
            AND deleted_by_recipient = FALSE
        ) AS unread_count
    FROM friendships f
    JOIN community_profiles cp ON cp.user_id = f.friend_id
    WHERE f.user_id = auth.uid()
    ORDER BY last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_friends() TO authenticated;

-- ============================================================
-- FUNCTION: Get Pending Friend Requests
-- ============================================================

CREATE OR REPLACE FUNCTION get_pending_friend_requests()
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    sender_display_name TEXT,
    sender_username TEXT,
    sender_avatar_url TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fr.id,
        fr.sender_id,
        cp.display_name,
        cp.username,
        cp.avatar_url,
        fr.created_at
    FROM friend_requests fr
    JOIN community_profiles cp ON cp.user_id = fr.sender_id
    WHERE fr.receiver_id = auth.uid()
    AND fr.status = 'pending'
    ORDER BY fr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_pending_friend_requests() TO authenticated;

-- ============================================================
-- FUNCTION: Get Sent Friend Requests
-- ============================================================

CREATE OR REPLACE FUNCTION get_sent_friend_requests()
RETURNS TABLE (
    id UUID,
    receiver_id UUID,
    receiver_display_name TEXT,
    receiver_username TEXT,
    receiver_avatar_url TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fr.id,
        fr.receiver_id,
        cp.display_name,
        cp.username,
        cp.avatar_url,
        fr.status,
        fr.created_at
    FROM friend_requests fr
    JOIN community_profiles cp ON cp.user_id = fr.receiver_id
    WHERE fr.sender_id = auth.uid()
    ORDER BY fr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_sent_friend_requests() TO authenticated;

-- ============================================================
-- GRANTS
-- ============================================================

GRANT ALL ON friend_requests TO authenticated;
GRANT ALL ON friendships TO authenticated;

-- ============================================================
-- NOTIFY PGRST TO RELOAD SCHEMA
-- ============================================================

NOTIFY pgrst, 'reload schema';