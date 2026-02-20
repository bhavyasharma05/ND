-- Add meta column to messages table for storing rich content like charts
alter table public.messages 
add column if not exists meta jsonb;

-- Update RLS policies (optional, usually select * covers new columns)
-- The existing select policy uses * so it should automatically include meta.
