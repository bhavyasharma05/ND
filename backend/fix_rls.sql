-- Add missing RLS policies for deleting and updating chat sessions
-- Run this script in your Supabase SQL Editor.

-- 1. Enable DELETE policy for chat_sessions
do $$ begin
  create policy "Users can delete own sessions"
    on public.chat_sessions for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 2. Enable UPDATE policy for chat_sessions
do $$ begin
  create policy "Users can update own sessions"
    on public.chat_sessions for update
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 3. (Optional) Cleanup orphaned messages if cascade fails
-- The schema already has 'on delete cascade', so deleting session should delete messages automatically.
