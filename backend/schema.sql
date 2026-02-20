-- Execute this in Supabase SQL Editor
-- This script is safe to run multiple times (Idempotent)

-- =======================================================
-- PART 1: User Profile Management (Login/Registration)
-- =======================================================

-- 1. Create profiles table (if not exists)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  constraint username_length check (char_length(full_name) >= 3)
);

-- 2. Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policies (wrapped in DO blocks to avoid errors if they exist)
do $$ begin
  create policy "Public profiles are viewable by everyone."
    on profiles for select using ( true );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert their own profile."
    on profiles for insert with check ( auth.uid() = id );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update own profile."
    on profiles for update using ( auth.uid() = id );
exception when duplicate_object then null; end $$;

-- 3. Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 4. Trigger (Drop first to ensure clean state)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =======================================================
-- PART 2: Chat Application Schema
-- =======================================================

-- 5. Create chat_sessions table
create table if not exists public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create messages table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Enable RLS for Chat Tables
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;

-- 8. Policies for Chat Sessions
do $$ begin
  create policy "Users can view own sessions"
    on public.chat_sessions for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert own sessions"
    on public.chat_sessions for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 9. Policies for Messages
do $$ begin
  create policy "Users can view own messages"
    on public.messages for select
    using (
      exists (
        select 1 from public.chat_sessions
        where chat_sessions.id = messages.session_id
        and chat_sessions.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert own messages"
    on public.messages for insert
    with check (
      exists (
        select 1 from public.chat_sessions
        where chat_sessions.id = messages.session_id
        and chat_sessions.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
