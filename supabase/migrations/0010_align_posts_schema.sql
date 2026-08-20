-- ============================================================
-- MIGRATION 0010: Align Posts Schema with Frontend Requirements
-- ============================================================
-- The frontend (Community.jsx) sends these fields when creating a post:
--   content, category, image_url, progress_data, community_id, type, title, tags, visibility
-- But the posts table only has: id, created_at, updated_at, created_by_id, community_id, type,
--   title, content, visibility, tags, is_pinned, is_locked, is_hidden, hidden_reason, hidden_by,
--   hidden_at, likes_count, replies_count, views_count, saves_count, related_focus_session_id
--
-- This migration adds the missing columns: category, image_url, progress_data

-- ============================================================
-- ADD MISSING COLUMNS TO POSTS TABLE
-- ============================================================

-- category: Single category field (e.g., 'DSA', 'Python', 'Web Development')
-- Frontend uses this for display and filtering alongside tags array
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS category TEXT;

-- image_url: URL for post image/media attachment
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- progress_data: JSONB for flexible progress tracking (study sessions, metrics, etc.)
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT '{}';

-- ============================================================
-- ADD INDEXES FOR NEW COLUMNS
-- ============================================================

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);

-- ============================================================
-- COMMENTS FOR NEW COLUMNS
-- ============================================================

COMMENT ON COLUMN public.posts.category IS 'Single category for display/filtering (e.g., DSA, Python, Web Development). Used alongside tags array.';
COMMENT ON COLUMN public.posts.image_url IS 'URL for post image or media attachment';
COMMENT ON COLUMN public.posts.progress_data IS 'JSONB object for progress tracking data (study minutes, problems solved, etc.)';

-- ============================================================
-- NOTIFY PGRST TO RELOAD SCHEMA
-- ============================================================
