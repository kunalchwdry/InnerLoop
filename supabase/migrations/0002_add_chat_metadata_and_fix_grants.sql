-- Add missing metadata column to chat_messages for agents module
-- Fix grants for anon role to allow proper authentication flow

-- Add metadata column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for metadata queries (for agent_name filtering)
CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata_agent_name 
ON chat_messages USING GIN ((metadata -> 'agent_name'));

-- Create index for conversation_id queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata_conversation_id 
ON chat_messages USING GIN ((metadata -> 'conversation_id'));

-- Update RLS policy to allow reading messages where user is part of conversation
-- (This assumes messages have metadata with user info or created_by_id)
-- The existing policy uses created_by_id which is correct for user ownership

-- Grant SELECT on chat_messages to anon for public read access (if needed)
-- Note: This is intentionally NOT granted as RLS should handle access control
-- The 401 errors are due to missing authenticated session, not grants

-- Ensure all tables have proper grants for authenticated role (should already exist from 0001)
-- These are idempotent
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON timetable_slots TO authenticated;
GRANT ALL ON habits TO authenticated;
GRANT ALL ON habit_logs TO authenticated;
GRANT ALL ON sleep_logs TO authenticated;
GRANT ALL ON exercise_logs TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON chat_messages TO authenticated;